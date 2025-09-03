import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chainId: string }> }
) {
  try {
    const { chainId } = await params
    const deploymentsPath = path.join(process.cwd(), '..', '..', 'deployments', `${chainId}.json`)
    
    if (!fs.existsSync(deploymentsPath)) {
      return NextResponse.json(null, { status: 404 })
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'))
    return NextResponse.json(deploymentData)
  } catch (error) {
    console.error('Error reading deployment file:', error)
    return NextResponse.json(null, { status: 500 })
  }
}