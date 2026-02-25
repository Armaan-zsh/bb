import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);

        // Format transcript into paragraphs
        let formattedText = '';
        let lastOffsetBlock = -1;

        for (const item of transcript) {
            const currentBlock = Math.floor(item.offset / 60000); // 60 seconds (in ms)
            if (currentBlock > lastOffsetBlock && formattedText.length > 0) {
                formattedText += '\n\n';
                lastOffsetBlock = currentBlock;
            } else if (formattedText.length > 0) {
                formattedText += ' ';
            }
            formattedText += item.text;
        }

        return NextResponse.json({ text: formattedText });
    } catch (error: any) {
        console.error('Failed to fetch transcript:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to fetch transcript' },
            { status: 500 }
        );
    }
}
