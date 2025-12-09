const DEFAULT_SEARCH_ENGINES = [
  {
    key: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?q={query}',
    icon: 'https://www.google.com/favicon.ico',
  },
  {
    key: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/search?q={query}',
    icon: 'https://www.bing.com/sa/simg/favicon-2x.ico',
  },
  {
    key: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q={query}',
    icon: 'https://duckduckgo.com/favicon.ico',
  },
  {
    key: 'baidu',
    name: 'Baidu',
    url: 'https://www.baidu.com/s?wd={query}',
    icon: 'https://www.baidu.com/favicon.ico',
  },
  {
    key: 'yahoo',
    name: 'Yahoo',
    url: 'https://search.yahoo.com/search?p={query}',
    icon: 'https://s.yimg.com/rz/l/favicon.ico',
  },
  {
    key: 'yandex',
    name: 'Yandex',
    url: 'https://yandex.com/search/?text={query}',
    icon: 'https://yandex.com/favicon.ico',
  },
];

export { DEFAULT_SEARCH_ENGINES };
export default DEFAULT_SEARCH_ENGINES;
