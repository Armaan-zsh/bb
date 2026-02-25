const fetch = require('node-fetch');

async function testV() {
  const res = await fetch('https://www.youtube.com/watch?v=1fUBWAETmkk', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  
  const match = html.match(/"captions":\s*({.+?})\s*,\s*"videoDetails"/);
  if (match) {
    const captionsData = JSON.parse(match[1]);
    const tracks = captionsData.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks && tracks.length > 0) {
      console.log('Found track URL:', tracks[0].baseUrl);
      const xmlRes = await fetch(tracks[0].baseUrl);
      const xmlText = await xmlRes.text();
      console.log('XML snippet:', xmlText.substring(0, 150));
    } else {
      console.log('No tracks found in caption data');
    }
  } else {
    console.log('Could not find captions JSON in HTML');
  }
}

testV().catch(console.error);
