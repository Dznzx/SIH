/* CivicSetu — i18n dictionary + switcher for the citizen-facing UI.
   The authority dashboard intentionally stays English (PROMPT.md step 7).

   Scope: this covers the static citizen-facing chrome (nav, hero, capture
   card, quick tiles, My Reports, Community Map headers/filters) plus the
   handful of strings JS sets at runtime (capture label, submit button
   states, filter-chip counts). Track Progress's labels are left as-is —
   they already show English and Hindi side by side per DESIGN.md's
   bilingual pattern, so they aren't gated behind this toggle. Per-report
   content generated from CIVIC.reports (card text, timeline, comments)
   keeps that same always-bilingual convention rather than being pulled
   into this system.

   EN and हिं only, by design — Santali was removed. I18N is keyed by
   locale code, so adding a third locale later is just adding a new
   key here plus an option in the language menu; nothing else about
   this structure needs to change to support it. */

const I18N = {
  en: {
    nav_home: 'Home', nav_myreports: 'My Reports', nav_map: 'Community Map', nav_track: 'Track Progress',
    report_issue: '＋ Report Issue',
    hero_heading: 'See a civic issue?<br>Report it. Route it. Get it resolved.',
    hero_body: 'One channel for potholes, garbage, broken handpumps and streetlights — with photo evidence, GPS tagging, and real-time status back to you.',
    hero_view_reports: 'View My Reports',
    hero_explore_map: 'Explore Community Map',
    stat_reports_label: 'daily reports (comparable metro)',
    stat_ulb_label: 'urban local bodies, one channel',
    stat_response_label: 'avg. response once triaged',
    gps_label: ' Auto GPS · Ward 12, Ranchi',
    cat_pothole: '🕳️ Pothole', cat_garbage: '🗑️ Garbage', cat_streetlight: '💡 Light', cat_handpump: '🚰 Water',
    desc_placeholder: 'Describe · voice or text',
    tap_to_capture: 'Tap to capture photo',
    photo_captured: 'Photo captured',
    dupe_alert_text: '⚠️ 3 similar issues nearby',
    confirm_instead: 'Confirm instead',
    submit_report: 'SUBMIT REPORT',
    submitted_ok: 'SUBMITTED ✓',
    queued_offline_ok: 'QUEUED — OFFLINE ✓',
    tile_myreports_title: 'My Reports', tile_myreports_body: "Track every issue you've submitted, from received to fixed.",
    tile_map_title: 'Community Map', tile_map_body: "See what's been reported near you and its live status.",
    tile_track_title: 'Track Progress', tile_track_body: "Follow a report's full timeline — before, during and after.",
    tile_authority_title: 'Authority View', tile_authority_body: 'Ranked queue, ward heatmap and SLA escalation for officials.',
    nearby_activity: 'Nearby Activity',
    nearby_activity_area: 'Ward 12 & surrounding',
    tip_title: '💡 Better Reports',
    tip_body_home: 'Include a clear photo and precise location to help officials resolve issues faster. Reports with photos are triaged 2× quicker.',
    tip_body_myreports: 'Include clear photos and a precise location to help officials resolve issues faster.',
    ward_heatmap_title: 'Ward Heatmap',
    ward_heatmap_area: 'Live issue density near you',
    myreports_heading: 'My Reports',
    myreports_sub: "Track the status of the issues you've reported in your community.",
    submit_new_report: '＋ Submit New Report',
    report_summary: '📊 Report Summary',
    summary_received: 'Received', summary_working: 'Working on it', summary_fixed: 'Fixed',
    filter_all: 'All', filter_received: 'Received', filter_working: 'Working', filter_fixed: 'Fixed',
    status_working: 'Working',
    filter_open: 'Open', filter_resolved: 'Resolved',
    load_more: 'Load More Reports',
    map_heading: 'Community Map',
    map_sub: 'See live civic issues reported near you.',
    map_search_placeholder: 'Search issues, locations…',
    nav_resolved: 'Completed Projects',
    nav_portfolio: 'Portfolio',
    nav_teambuilder: 'Team Builder',
    footer_gram_sevak: 'Gram Sevak · CivicSetu prototype · Chaos Crew',
    footer_about: 'About Us',
    footer_contact: 'Contact Support',
    footer_privacy: 'Privacy Policy',
    footer_lang: '🌐 Language',
    btn_close: 'Close',
    demo_network_label: 'DEMO · NETWORK',
    btn_online: 'ONLINE',
    profile_demo_citizen: '👤 Demo Citizen',
    profile_ward: 'Ward 12, Ranchi',
    profile_stat: '0 reports submitted this session',
    btn_signout: '↪ Sign out',
    resolved_heading: 'Completed Projects',
    report_issue_heading: 'Report an Issue',
    back_to_myreports: '← Back to My Reports',
    progress_heading: 'Progress',
    comments_heading: '💬 Community Comments',
    comment_placeholder: 'Write your comment here…',
    post_comment_btn: 'Post Comment',
    before_label: 'Before',
    after_label: 'After',
    awaiting_completion: 'Awaiting Completion',
    nav_investor: 'Investor Connect',
    inv_heading: '💼 Investor Connect Portal',
    inv_sub: 'Connect shortlisted civic solutions & university prototypes with registered Angel Investors and VCs.',
    inv_domain_filter: 'Filter Domain:',
    nav_policy: 'Policy Insights',
    pol_heading: '📜 Government Policy Insight Reports',
    pol_sub: 'Aggregated civic challenge data & spatial clustering converted into policy briefs for Ministries and Municipal Executives.'
  },
  hi: {
    nav_home: 'होम', nav_myreports: 'मेरी रिपोर्ट', nav_map: 'सामुदायिक मानचित्र', nav_track: 'प्रगति देखें',
    report_issue: '＋ समस्या दर्ज करें',
    hero_heading: 'कोई नागरिक समस्या दिखी?<br>रिपोर्ट करें। भेजें। हल करवाएं।',
    hero_body: 'गड्ढे, कचरा, टूटे हैंडपंप और स्ट्रीटलाइट के लिए एक ही माध्यम — फोटो प्रमाण, जीपीएस टैगिंग और रीयल-टाइम स्थिति के साथ।',
    hero_view_reports: 'मेरी रिपोर्ट देखें',
    hero_explore_map: 'सामुदायिक मानचित्र देखें',
    stat_reports_label: 'दैनिक रिपोर्ट (तुलनीय शहर)',
    stat_ulb_label: 'शहरी निकाय, एक माध्यम',
    stat_response_label: 'औसत प्रतिक्रिया समय',
    gps_label: ' ऑटो जीपीएस · वार्ड 12, रांची',
    cat_pothole: '🕳️ गड्ढा', cat_garbage: '🗑️ कचरा', cat_streetlight: '💡 लाइट', cat_handpump: '🚰 पानी',
    desc_placeholder: 'विवरण लिखें या बोलें',
    tap_to_capture: 'फोटो लेने के लिए टैप करें',
    photo_captured: 'फोटो ले ली गई',
    dupe_alert_text: '⚠️ पास में 3 मिलती-जुलती समस्याएं',
    confirm_instead: 'इसकी पुष्टि करें',
    submit_report: 'रिपोर्ट भेजें',
    submitted_ok: 'भेज दी गई ✓',
    queued_offline_ok: 'क्यू में — ऑफ़लाइन ✓',
    tile_myreports_title: 'मेरी रिपोर्ट', tile_myreports_body: 'अपनी हर रिपोर्ट को प्राप्त से ठीक होने तक ट्रैक करें।',
    tile_map_title: 'सामुदायिक मानचित्र', tile_map_body: 'देखें आपके आसपास क्या रिपोर्ट हुआ है और उसकी स्थिति।',
    tile_track_title: 'प्रगति देखें', tile_track_body: 'रिपोर्ट की पूरी समयरेखा देखें — पहले, दौरान और बाद में।',
    tile_authority_title: 'अधिकारी दृश्य', tile_authority_body: 'अधिकारियों के लिए रैंक की गई सूची, वार्ड हीटमैप और एसएलए एस्केलेशन।',
    nearby_activity: 'आस-पास की गतिविधि',
    nearby_activity_area: 'वार्ड 12 और आसपास',
    tip_title: '💡 बेहतर रिपोर्ट',
    tip_body_home: 'स्पष्ट फोटो और सटीक स्थान शामिल करें ताकि अधिकारी जल्दी समाधान कर सकें। फोटो वाली रिपोर्ट 2× तेज़ी से देखी जाती हैं।',
    tip_body_myreports: 'स्पष्ट फोटो और सटीक स्थान शामिल करें ताकि अधिकारी जल्दी समाधान कर सकें।',
    ward_heatmap_title: 'वार्ड हीटमैप',
    ward_heatmap_area: 'आपके पास की मौजूदा समस्या सघनता',
    myreports_heading: 'मेरी रिपोर्ट',
    myreports_sub: 'अपने समुदाय में दर्ज की गई समस्याओं की स्थिति देखें।',
    submit_new_report: '＋ नई रिपोर्ट भेजें',
    report_summary: '📊 रिपोर्ट सारांश',
    summary_received: 'प्राप्त हुआ', summary_working: 'काम चल रहा है', summary_fixed: 'ठीक हो गया',
    filter_all: 'सभी', filter_received: 'प्राप्त हुआ', filter_working: 'काम जारी', filter_fixed: 'ठीक हो गया',
    status_working: 'काम जारी',
    filter_open: 'खुला', filter_resolved: 'हल हो गया',
    load_more: 'और रिपोर्ट देखें',
    map_heading: 'सामुदायिक मानचित्र',
    map_sub: 'अपने आसपास दर्ज नागरिक समस्याएं देखें।',
    map_search_placeholder: 'समस्या या स्थान खोजें…',
    nav_resolved: 'पूर्ण परियोजनाएं',
    nav_portfolio: 'पोर्टफोलियो',
    nav_teambuilder: 'टीम बिल्डर',
    footer_gram_sevak: 'ग्राम सेवक · सिविकसेतु प्रोटोटाइप · Chaos Crew',
    footer_about: 'हमारे बारे में',
    footer_contact: 'सहायता से संपर्क करें',
    footer_privacy: 'गोपनीयता नीति',
    footer_lang: '🌐 भाषा',
    btn_close: 'बंद करें',
    demo_network_label: 'डेमो · नेटवर्क',
    btn_online: 'ऑनलाइन',
    profile_demo_citizen: '👤 डेमो नागरिक',
    profile_ward: 'वार्ड 12, रांची',
    profile_stat: 'इस सत्र में 0 रिपोर्ट भेजी',
    btn_signout: '↪ साइन आउट',
    resolved_heading: 'पूर्ण परियोजनाएं',
    report_issue_heading: 'समस्या दर्ज करें',
    back_to_myreports: '← मेरी रिपोर्ट पर वापस जाएं',
    progress_heading: 'प्रगति',
    comments_heading: '💬 सामुदायिक टिप्पणियाँ',
    comment_placeholder: 'अपनी टिप्पणी यहाँ लिखें…',
    post_comment_btn: 'टिप्पणी पोस्ट करें',
    before_label: 'पहले',
    after_label: 'बाद में',
    awaiting_completion: 'पूरा होने की प्रतीक्षा में',
    nav_investor: 'इन्वेस्टर कनेक्ट',
    inv_heading: '💼 इन्वेस्टर कनेक्ट पोर्टल',
    inv_sub: 'शॉर्टलिस्ट किए गए नागरिक समाधानों और विश्वविद्यालय प्रोटोटाइप को एंजेल निवेशकों और वीसी से जोड़ें।',
    inv_domain_filter: 'डोमेन फ़िल्टर:',
    nav_policy: 'नीति अंतर्दृष्टि',
    pol_heading: '📜 सरकारी नीति अंतर्दृष्टि रिपोर्ट',
    pol_sub: 'मंत्रालयों और नगर निगम अधिकारियों के लिए नीति संक्षेप में परिवर्तित एकीकृत नागरिक चुनौती डेटा।'
  }
};

// 22 Scheduled Official Languages of India (8th Schedule of the Constitution of India)
const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', region: 'Pan-India / International' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', region: 'North & Central India' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', region: 'West Bengal / Tripura' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', region: 'Andhra Pradesh / Telangana' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', region: 'Maharashtra' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', region: 'Tamil Nadu / Puducherry' },
  { code: 'ur', name: 'Urdu', native: 'اردو', region: 'Pan-India' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', region: 'Gujarat' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', region: 'Kerala' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', region: 'Odisha' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', region: 'Punjab' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', region: 'Assam' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली', region: 'Bihar / Jharkhand' },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', region: 'Jharkhand / Odisha' },
  { code: 'ks', name: 'Kashmiri', native: 'कॉशुर / كأشُر', region: 'Jammu & Kashmir' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', region: 'Sikkim / West Bengal' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी', region: 'Goa' },
  { code: 'sd', name: 'Sindhi', native: 'सिन्धी / سنڌي', region: 'Pan-India' },
  { code: 'dog', name: 'Dogri', native: 'डोगरी', region: 'Jammu & Kashmir' },
  { code: 'mni', name: 'Manipuri', native: 'মৈতৈলোন্', region: 'Manipur' },
  { code: 'brx', name: 'Bodo', native: 'बर\'', region: 'Assam' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', region: 'Classical / Pan-India' }
];

let currentLang = localStorage.getItem('civic_lang') || 'en';

function tPlain(key){
  return I18N[currentLang]?.[key] || I18N['hi']?.[key] || I18N['en']?.[key] || key;
}

function tc(en, hi) {
  return (currentLang === 'en') ? en : hi;
}

function t(key){
  return I18N[currentLang]?.[key] || I18N['hi']?.[key] || I18N['en']?.[key] || key;
}

function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const val = t(el.dataset.i18n);
    if(val!=null) el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    el.placeholder = tPlain(el.dataset.i18nPlaceholder);
  });
  document.documentElement.lang = currentLang;

  // Update active status on buttons
  document.querySelectorAll('.lang-menu button, .lang-grid-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.lang===currentLang);
  });

  // Announce language change to accessibility live region if loaded
  if (typeof announceToScreenReader === 'function') {
    const langObj = INDIAN_LANGUAGES.find(l => l.code === currentLang);
    if (langObj) announceToScreenReader(`Language changed to ${langObj.name} (${langObj.native})`);
  }

  if(typeof updateReportCounts==='function') updateReportCounts();
}

function setLang(lang){
  currentLang = lang;
  localStorage.setItem('civic_lang', lang);
  applyI18n();
  const langMenu = document.getElementById('langMenu');
  if(langMenu) langMenu.classList.remove('show');
  const langModal = document.getElementById('langModal');
  if(langModal) langModal.style.display = 'none';
}

function render22LanguagesModal() {
  const container = document.getElementById('22LanguagesGrid');
  if (!container) return;

  container.innerHTML = INDIAN_LANGUAGES.map(l => `
    <button class="lang-grid-btn ${l.code === currentLang ? 'active' : ''}" data-lang="${l.code}" onclick="setLang('${l.code}')">
      <div class="lang-native">${l.native}</div>
      <div class="lang-english">${l.name}</div>
      <div class="lang-region">${l.region}</div>
    </button>
  `).join('');
}

document.addEventListener('DOMContentLoaded', ()=>{
  applyI18n();
  render22LanguagesModal();
});
