
export const TRANSLATIONS = {
  en: {
    // Nav
    'nav.found': 'I Found Something',
    'nav.lost': 'I Lost Something',
    'nav.browse': 'Browse Found Items',
    'nav.reports': 'Loss Reports',
    'nav.spotters': 'Spotter Network',
    'nav.dashboard': 'My Dashboard',
    'nav.login': 'Sign In',

    // Home
    'home.tagline': 'Lost something in Nepal? The community is already looking.',
    'home.stats.found': 'Items Found',
    'home.stats.reports': 'Active Reports',
    'home.stats.recovered': 'Successful Recoveries',

    // Forms
    'form.title': 'Title',
    'form.description': 'Description',
    'form.category': 'Category',
    'form.location': 'Location',
    'form.submit': 'Submit',
    'form.save_draft': 'Save as Draft',

    // Offline
    'offline.banner': 'You are offline. Your report will be saved and submitted when you reconnect.',
    'offline.drafts': 'Offline Drafts',
    'offline.sync': 'Sync Now',
    'offline.sync_all': 'Sync All',
    'offline.synced': 'Synced successfully',

    // Claim
    'claim.title': 'Claim This Item',
    'claim.code_label': 'Your Claim Code',
    'claim.instruction': 'Show this code to the finder when you meet to collect your item.',
    'claim.upload_photo': 'Upload Reunion Photo',
    'claim.verified': 'Handover Verified',

    // Categories
    'cat.passport': 'Passport',
    'cat.camera': 'Camera',
    'cat.wallet': 'Wallet',
    'cat.phone': 'Phone',
    'cat.trekking_gear': 'Trekking Gear',
    'cat.bag': 'Bag',
    'cat.jewelry': 'Jewelry',
    'cat.keys': 'Keys',
    'cat.other': 'Other',

    // Status
    'status.unclaimed': 'Unclaimed',
    'status.matched': 'Matched',
    'status.claimed': 'Claimed',
    'status.donated': 'Donated',
    'status.searching': 'Searching',
    'status.recovered': 'Recovered',
  },

  ne: {
    // Nav
    'nav.found': 'मैले केही भेटें',
    'nav.lost': 'मेरो सामान हरायो',
    'nav.browse': 'भेटिएका सामान हेर्नुस्',
    'nav.reports': 'हराएका रिपोर्ट',
    'nav.spotters': 'स्पोटर नेटवर्क',
    'nav.dashboard': 'मेरो ड्यासबोर्ड',
    'nav.login': 'साइन इन',

    // Home
    'home.tagline': 'नेपालमा केही हरायो? समुदाय खोजिरहेको छ।',
    'home.stats.found': 'भेटिएका सामान',
    'home.stats.reports': 'सक्रिय रिपोर्ट',
    'home.stats.recovered': 'सफल पुनर्प्राप्ति',

    // Forms
    'form.title': 'शीर्षक',
    'form.description': 'विवरण',
    'form.category': 'श्रेणी',
    'form.location': 'स्थान',
    'form.submit': 'पेश गर्नुस्',
    'form.save_draft': 'ड्राफ्ट सुरक्षित गर्नुस्',

    // Offline
    'offline.banner': 'तपाईं अफलाइन हुनुहुन्छ। जडान भएपछि रिपोर्ट पठाइनेछ।',
    'offline.drafts': 'अफलाइन ड्राफ्ट',
    'offline.sync': 'अहिले सिंक गर्नुस्',
    'offline.sync_all': 'सबै सिंक गर्नुस्',
    'offline.synced': 'सफलतापूर्वक सिंक भयो',

    // Claim
    'claim.title': 'यो सामान दाबी गर्नुस्',
    'claim.code_label': 'तपाईंको दाबी कोड',
    'claim.instruction': 'सामान लिन भेट्दा फाइन्डरलाई यो कोड देखाउनुस्।',
    'claim.upload_photo': 'भेट्ने फोटो अपलोड गर्नुस्',
    'claim.verified': 'हस्तान्तरण प्रमाणित',

    // Categories
    'cat.passport': 'राहदानी',
    'cat.camera': 'क्यामेरा',
    'cat.wallet': 'पर्स',
    'cat.phone': 'फोन',
    'cat.trekking_gear': 'ट्रेकिङ सामान',
    'cat.bag': 'झोला',
    'cat.jewelry': 'गहना',
    'cat.keys': 'साँचो',
    'cat.other': 'अन्य',

    // Status
    'status.unclaimed': 'दाबी नगरिएको',
    'status.matched': 'मिलान भयो',
    'status.claimed': 'दाबी गरियो',
    'status.donated': 'दान गरियो',
    'status.searching': 'खोजिँदैछ',
    'status.recovered': 'फिर्ता भयो',
  }
};

export function createTranslator(lang) {
  return (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['en'][key] ?? key;
}