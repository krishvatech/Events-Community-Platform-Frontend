export const statisticsBase = '/mergers-and-acquisitions-statistics';
export const statisticsLinks = [
  ['M&A Statistics', statisticsBase],
  ['M&A Statistics by Industries', `${statisticsBase}/ma-statistics-by-industries/`],
  ['M&A Statistics by Transaction Type', `${statisticsBase}/ma-statistics-by-transaction-type/`],
  ['M&A Statistics by Countries', `${statisticsBase}/ma-statistics-by-countries/`],
  ['United States – M&A Statistics', `${statisticsBase}/united-states-ma-statistics/`],
  ['Canada – M&A Statistics', `${statisticsBase}/canada-ma-statistics/`],
  ['United Kingdom – M&A Statistics', `${statisticsBase}/united-kingdom-ma-statistics/`],
  ['China – M&A Statistics', `${statisticsBase}/china-ma-statistics/`],
  ['Germany – M&A Statistics', `${statisticsBase}/germany-ma-statistics/`],
  ['Switzerland – M&A Statistics', `${statisticsBase}/switzerland-ma-statistics/`],
  ['Austria – M&A Statistics', `${statisticsBase}/mergers-acquisitions-austria/`],
  ['Singapore – M&A Statistics', `${statisticsBase}/singapore-ma-statistics/`],
];
export const statisticsSlugs = statisticsLinks.slice(1).map(([, path]) => path.split('/')[2]);
