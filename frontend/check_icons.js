const https = require('https');

const icons = {
  'TikTok': 'https://img.icons8.com/3d-fluency/94/tiktok.png',
  'Facebook': 'https://img.icons8.com/3d-fluency/94/facebook-logo.png',
  'Google': 'https://img.icons8.com/3d-fluency/94/google-logo.png',
  'Instagram': 'https://img.icons8.com/3d-fluency/94/instagram-new.png',
  'YouTube': 'https://img.icons8.com/3d-fluency/94/youtube-play.png',
  'Shopee': 'https://img.icons8.com/color/94/shopee.png', // Shopee might not have 3d-fluency
  'Telegram': 'https://img.icons8.com/3d-fluency/94/telegram.png',
  'Twitter': 'https://img.icons8.com/3d-fluency/94/twitter.png',
  'Threads': 'https://img.icons8.com/3d-fluency/94/threads.png',
  'Lazada': 'https://img.icons8.com/color/94/lazada.png'
};

Object.entries(icons).forEach(([name, url]) => {
  https.get(url, (res) => {
    console.log(`${name}: ${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
