const https = require('https');

const urls = [
  'https://img.icons8.com/color/94/twitterx.png',
  'https://img.icons8.com/color/94/twitter.png',
  'https://img.icons8.com/color/94/twitter--v1.png',
  'https://img.icons8.com/fluency/94/twitter.png',
  'https://img.icons8.com/color/94/threads.png',
  'https://img.icons8.com/fluency/94/threads.png',
  'https://img.icons8.com/color/94/lazada.png',
  'https://img.icons8.com/fluency/94/lazada.png',
  'https://img.icons8.com/nolan/94/twitter.png',
  'https://img.icons8.com/nolan/94/threads.png'
];

urls.forEach((url) => {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
