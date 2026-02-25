import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    try {
        console.log(`Fetching transcript via yt-dlp for ${videoId}...`);

        // Use yt-dlp to dump the JSON metadata, which contains the automatic captions 
        // without downloading the actual video.
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const cmd = `yt-dlp --write-auto-subs --skip-download --sub-langs "en" --dump-json "${url}"`;

        const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer for large JSONs
        const data = JSON.parse(stdout);

        if (!data.automatic_captions || !data.automatic_captions.en) {
            return NextResponse.json({ error: 'No English captions found for this video.' }, { status: 404 });
        }

        // yt-dlp returns multiple formats for the subtitles (vtt, json3, srv1, etc)
        // json3 is the easiest to parse for pure text
        const json3Format = data.automatic_captions.en.find((f: any) => f.ext === 'json3');

        if (!json3Format) {
            return NextResponse.json({ error: 'Supported caption format not found.' }, { status: 404 });
        }

        // Fetch the actual caption JSON
        const captionRes = await fetch(json3Format.url);
        if (!captionRes.ok) throw new Error('Failed to download caption file');

        const captionData = await captionRes.json();

        // Parse YouTube's json3 format into readable paragraphs
        let formattedText = '';
        let lastOffsetBlock = -1;

        if (captionData.events) {
            for (const event of captionData.events) {
                if (!event.segs) continue;

                const text = event.segs.map((s: any) => s.utf8).join('');
                if (!text.trim() || text.trim() === '\\n') continue;

                // Create a paragraph break roughly every 60 seconds
                const currentBlock = Math.floor((event.tStartMs || 0) / 60000);
                if (currentBlock > lastOffsetBlock && formattedText.length > 0) {
                    formattedText += '\n\n';
                    lastOffsetBlock = currentBlock;
                } else if (formattedText.length > 0) {
                    formattedText += ' ';
                }
                formattedText += text;
            }
        }

        // Clean up common YT caption artifacts 
        const cleanedText = formattedText.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();

        return NextResponse.json({ text: cleanedText });

    } catch (error: any) {
        console.error('yt-dlp transcript extraction failed:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to extract transcript via yt-dlp' },
            { status: 500 }
        );
    }
}
