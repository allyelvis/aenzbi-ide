import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

export async function POST(req: Request) {
  const { command, userId } = await req.json()

  // List of allowed commands (you can expand this list as needed)
  const allowedCommands = ['ls', 'pwd', 'echo', 'cat', 'mkdir', 'touch']

  // Check if the command is allowed
  const isAllowed = allowedCommands.some(cmd => command.startsWith(cmd))

  if (!isAllowed) {
    return NextResponse.json({ error: 'Command not allowed' }, { status: 403 })
  }

  try {
    // Create a user-specific container if it doesn't exist
    await execPromise(`docker inspect aenzbi-sandbox-${userId} || docker run -d --name aenzbi-sandbox-${userId} aenzbi-sandbox`)

    // Execute the command in the user's container
    const { stdout, stderr } = await execPromise(`docker exec aenzbi-sandbox-${userId} ${command}`)
    return NextResponse.json({ output: stdout || stderr })
  } catch (error) {
    console.error('Error executing command:', error)
    return NextResponse.json({ error: 'An error occurred while executing the command' }, { status: 500 })
  }
}
