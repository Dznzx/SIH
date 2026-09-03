/* CivicSetu — DBSCAN clustering over report locations.

   A real DBSCAN implementation (density-based, not k-means/fixed-radius):
   a point is a "core point" if at least minPts other points fall within
   eps of it; clusters grow by chaining core points together, and points
   that don't belong to any cluster are noise. Distance is real
   great-circle distance (haversine, metres) over report lat/lng, not
   pixel or grid distance.

   Two consumers:
   1. Duplicate detection (citizen capture flow) — clusters same-category,
      unresolved reports and, given a draft report's coordinates, finds
      which existing cluster it would join (if any). This replaces the
      old fixed pairwise radius+time check in app.js's findDuplicate().
   2. Hotspot overlay (Community Map + authority dashboard) — clusters
      ALL unresolved reports regardless of category to surface areas with
      a real concentration of civic issues, not just one-off pins.

   Category is enforced as a hard constraint (not a DBSCAN input) by
   clustering each category's reports separately for (1), and left mixed
   for the general-purpose hotspot pass (2) — a real hotspot is "lots of
   issues here", not "lots of the same issue here".
*/
const GeoCluster = (function(){

  function haversineMeters(lat1, lng1, lat2, lng2){
    const R = 6371000, toRad = d => d*Math.PI/180;
    const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // Standard DBSCAN. points: array of {lat, lng, ...}. Returns the same
  // array with a `.clusterId` added to each point (-1 = noise, i.e. not
  // part of any cluster). eps in metres, minPts includes the point itself.
  function dbscan(points, eps, minPts){
    const NOISE = -1, UNVISITED = 0;
    const n = points.length;
    const labels = new Array(n).fill(UNVISITED);
    let clusterId = 0;

    function regionQuery(i){
      const neighbors = [];
      for(let j = 0; j < n; j++){
        if(i === j) continue;
        if(haversineMeters(points[i].lat, points[i].lng, points[j].lat, points[j].lng) <= eps){
          neighbors.push(j);
        }
      }
      return neighbors;
    }

    for(let i = 0; i < n; i++){
      if(labels[i] !== UNVISITED) continue;
      const neighbors = regionQuery(i);
      if(neighbors.length + 1 < minPts){
        labels[i] = NOISE;
        continue;
      }
      clusterId++;
      labels[i] = clusterId;
      const seeds = neighbors.slice();
      for(let k = 0; k < seeds.length; k++){
        const j = seeds[k];
        if(labels[j] === NOISE) labels[j] = clusterId;
        if(labels[j] !== UNVISITED) continue;
        labels[j] = clusterId;
        const jNeighbors = regionQuery(j);
        if(jNeighbors.length + 1 >= minPts){
          jNeighbors.forEach(x=>{ if(!seeds.includes(x)) seeds.push(x); });
        }
      }
    }

    points.forEach((p, i)=>{ p.clusterId = labels[i]; });
    return points;
  }

  function centroid(pts){
    const lat = pts.reduce((s,p)=>s+p.lat, 0) / pts.length;
    const lng = pts.reduce((s,p)=>s+p.lng, 0) / pts.length;
    return { lat, lng };
  }

  function groupClusters(labelledPoints){
    const byId = new Map();
    labelledPoints.forEach(p=>{
      if(p.clusterId === -1) return;
      if(!byId.has(p.clusterId)) byId.set(p.clusterId, []);
      byId.get(p.clusterId).push(p);
    });
    return [...byId.values()].map(members=>({ members, center: centroid(members) }));
  }

  // ---- Consumer 1: duplicate detection ----
  // Runs DBSCAN over `reports` PLUS the draft point together (not the
  // existing reports alone) — a single existing report is noise on its
  // own under minPts>=2, but adding the draft point can legitimately
  // densify it into a real 2+ point cluster, which is exactly the "this
  // new report would join an existing issue" case we need to catch.
  // Returns { cluster, nearestMember } (cluster/members = existing
  // reports only, draft point excluded) or null if the draft is noise.
  function findJoinableCluster(reports, draftLat, draftLng, eps, minPts){
    if(reports.length === 0) return null;
    const points = reports.map(r=>({ ref: r, lat: r.lat, lng: r.lng }));
    const draftPoint = { ref: null, lat: draftLat, lng: draftLng, isDraft: true };
    const labelled = dbscan(points.concat([draftPoint]), eps, minPts);
    const draftLabel = labelled[labelled.length - 1].clusterId;
    if(draftLabel === -1) return null;
    const members = labelled.filter(p => p.clusterId === draftLabel && !p.isDraft);
    if(members.length === 0) return null;
    members.sort((a,b)=>
      haversineMeters(draftLat, draftLng, a.lat, a.lng) - haversineMeters(draftLat, draftLng, b.lat, b.lng));
    return { cluster: { members }, nearestMember: members[0].ref };
  }

  // ---- Consumer 2: hotspot overlay ----
  // Clusters all given reports (mixed category) into hotspots. Returns
  // [{ center:{lat,lng}, count, categories:{cat:count}, members:[report,...] }],
  // sorted by size descending.
  function findHotspots(reports, eps, minPts){
    if(reports.length === 0) return [];
    const points = reports.map(r=>({ ref: r, lat: r.lat, lng: r.lng }));
    const labelled = dbscan(points, eps, minPts);
    const clusters = groupClusters(labelled);
    return clusters.map(c=>{
      const categories = {};
      c.members.forEach(m=>{ categories[m.ref.category] = (categories[m.ref.category]||0) + 1; });
      return { center: c.center, count: c.members.length, categories, members: c.members.map(m=>m.ref) };
    }).sort((a,b)=> b.count - a.count);
  }

  return { haversineMeters, dbscan, findJoinableCluster, findHotspots };
})();
