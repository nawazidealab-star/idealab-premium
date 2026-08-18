export type LogoFolioItem = {
  id: string;
  title: string;
  tag: string;
  image: string;
};

// Logo folio is intentionally kept in one data file so new work can be added
// without changing the Work page layout. Add a new object for each future logo.
export const logoFolioItems: LogoFolioItem[] = [
  { id: 'hijab-house', title: 'Hijab House', tag: 'Logo Design', image: '/logo-folio/hijab-house.webp' },
  { id: 'idea-lab-media', title: 'IDEA LAB Media', tag: 'Logo Design', image: '/logo-folio/idea-lab-media.webp' },
  { id: 'al-ramsh', title: 'Al-Ramsh', tag: 'Logo Design', image: '/logo-folio/al-ramsh.webp' },
  { id: 'logi-global-pioneers', title: 'Logi Global Pioneers', tag: 'Logo Design', image: '/logo-folio/logi-global-pioneers.webp' },
  { id: 'yusra-dental-care', title: 'Yusra Dental Care', tag: 'Logo Design', image: '/logo-folio/yusra-dental-care.webp' },
  { id: 'ziya-by-noor', title: 'Ziya by Noor', tag: 'Logo Design', image: '/logo-folio/ziya-by-noor.webp' },
  { id: 'ammarah-naeem', title: 'Ammarah Naeem', tag: 'Logo Design', image: '/logo-folio/ammarah-naeem.webp' },
  { id: 'aus-estate-hub', title: 'Aus Estate Hub', tag: 'Logo Design', image: '/logo-folio/aus-estate-hub.webp' }
];
