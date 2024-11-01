import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import util from 'util'
import path from 'path'
import fs from 'fs/promises'

const execPromise = util.promisify(exec)

export async function POST(req: Request) {
  try {
    const { projectName } = await req.json()
    const projectPath = path.join(process.cwd(), 'user_files', projectName)

    // Check if the project directory exists
    await fs.access(projectPath)

    // Deploy to Vercel
    const { stdout, stderr } = await execPromise(`cd ${projectPath} && vercel --prod`)

    if (stderr) {
      console.error('Deployment error:', stderr)
      return NextResponse.json({ error: 'An error occurred during deployment' }, { status: 500 })
    }

    // Extract the deployment URL from stdout
    const deploymentUrl = stdout.match(/https:\/\/[^\s]+/)?.[0]

    if (!deploymentUrl) {
      return NextResponse.json({ error: 'Failed to retrieve deployment URL' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Deployment successful', url: deploymentUrl }, { status: 200 })
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json({ error: 'An error occurred during deployment' }, { status: 500 })
  }
}
