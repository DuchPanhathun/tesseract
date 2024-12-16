import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface RequestBody {
  text: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  let text: string | undefined;
  try {
    const { text: requestText }: RequestBody = await request.json();
    text = requestText;

    // Log the received text
    console.log('Received text for summarization:', text);
    
    // Use the absolute path to the Python script
    const pythonScriptPath = '/Users/thun/Desktop/Research-Document/llm_summary/chat.py';
    
    // Construct the command
    const command = `python3 "${pythonScriptPath}" "${text}"`;
    console.log('Executing command:', command);
    
    // Execute Python script with the absolute path
    const { stdout, stderr } = await execAsync(command);

    // Log the Python script output
    console.log('Python stdout:', stdout);
    if (stderr) {
      console.log('Python stderr:', stderr);
    }

    const summary = stdout.trim();
    console.log('Generated summary:', summary);

    return NextResponse.json({ 
      summary,
      debug: {
        receivedText: text,
        command: command,
        stdout: stdout,
        stderr: stderr
      }
    });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : String(error),
        debug: {
          receivedText: text ?? 'No text received',
          pythonScriptPath: '/Users/thun/Desktop/Research-Document/llm_summary/chat.py'
        }
      },
      { status: 500 }
    );
  }
}
