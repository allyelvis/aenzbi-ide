'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Resizable } from 're-resizable'
import Editor from "@monaco-editor/react"
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { io } from 'socket.io-client'
import path from 'path'
import 'xterm/css/xterm.css'

type FileSystemItem = {
  name: string
  type: 'file' | 'folder'
  children?: FileSystemItem[]
}

const getLanguageFromFileName = (fileName: string): string => {
  const extension = path.extname(fileName).toLowerCase()
  switch (extension) {
    case '.js':
    case '.jsx':
      return 'javascript'
    case '.ts':
    case '.tsx':
      return 'typescript'
    case '.html':
      return 'html'
    case '.css':
      return 'css'
    case '.json':
      return 'json'
    case '.md':
      return 'markdown'
    default:
      return 'plaintext'
  }
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [code, setCode] = useState('// Write your code here')
  const terminalRef = useRef<HTMLDivElement>(null)
  const [terminal, setTerminal] = useState<Terminal | null>(null)
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>([
    {
      name: 'src',
      type: 'folder',
      children: [
        { name: 'index.js', type: 'file' },
        { name: 'styles.css', type: 'file' },
      ],
    },
    { name: 'README.md', type: 'file' },
  ])
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [currentLanguage, setCurrentLanguage] = useState<string>('javascript')
  const [currentProject, setCurrentProject] = useState<string>('my-project')
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null)
  const [socket, setSocket] = useState<any>(null)
  const [room, setRoom] = useState<string>('default-room')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const newSocket = io('http://localhost:3000')
    setSocket(newSocket)

    newSocket.emit('joinRoom', room)

    newSocket.on('codeUpdate', (updatedCode: string) => {
      setCode(updatedCode)
    })

    return () => {
      newSocket.disconnect()
    }
  }, [room])

  useEffect(() => {
    if (terminalRef.current && !terminal) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
        },
      })
      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)
      fitAddon.fit()

      term.writeln('Welcome to Aenzbi Secure Terminal')
      term.writeln('Type your commands here...')

      setTerminal(term)

      let currentLine = ''
      term.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey

        if (domEvent.keyCode === 13) {
          term.write('\r\n')
          executeCommand(currentLine, term)
          currentLine = ''
        } else if (domEvent.keyCode === 8) {
          if (currentLine.length > 0) {
            term.write('\b \b')
            currentLine = currentLine.slice(0, -1)
          }
        } else if (printable) {
          term.write(key)
          currentLine += key
        }
      })

      term.write('\r\n$ ')
    }
  }, [terminal])

  const executeCommand = async (command: string, term: Terminal) => {
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, userId: session?.user?.email }),
      })
      const data = await response.json()
      if (data.output) {
        term.writeln(data.output)
      } else if (data.error) {
        term.writeln(`Error: ${data.error}`)
      }
    } catch (error) {
      term.writeln('An error occurred while executing the command')
    }
    term.write('\r\n$ ')
  }

  const handleFileClick = async (fileName: string) => {
    setCurrentFile(fileName)
    setCurrentLanguage(getLanguageFromFileName(fileName))
    try {
      const response = await fetch(`/api/files/load?fileName=${encodeURIComponent(fileName)}`)
      if (response.ok) {
        const data = await response.json()
        setCode(data.content)
      } else {
        console.error('Failed to load file')
      }
    } catch (error) {
      console.error('Error loading file:', error)
    }
  }

  const renderFileSystem = (items: FileSystemItem[], depth = 0) => {
    return items.map((item) => (
      <div key={item.name} style={{ marginLeft: `${depth * 20}px` }}>
        {item.type === 'folder' ? (
          <div>
            <span className="font-bold">{item.name}/</span>
            {item.children && renderFileSystem(item.children, depth + 1)}
          </div>
        ) : (
          <div
            className="cursor-pointer hover:text-blue-500"
            onClick={() => handleFileClick(item.name)}
          >
            {item.name}
          </div>
        )}
      </div>
    ))
  }

  const handleNewFile = () => {
    const fileName = prompt('Enter file name:')
    if (fileName) {
      setFileSystem([...fileSystem, { name: fileName, type: 'file' }])
      setCurrentFile(fileName)
      setCode('')
    }
  }

  const handleNewFolder = () => {
    const folderName = prompt('Enter folder name:')
    if (folderName) {
      setFileSystem([...fileSystem, { name: folderName, type: 'folder', children: [] }])
    }
  }

  const handleSaveFile = async () => {
    if (!currentFile) {
      alert('Please select or create a file first')
      return
    }

    try {
      const response = await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: currentFile, content: code }),
      })

      if (response.ok) {
        alert('File saved successfully')
      } else {
        alert('Failed to save file')
      }
    } catch (error) {
      console.error('Error saving file:', error)
      alert('An error occurred while saving the file')
    }
  }

  const handleDeploy = async () => {
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: currentProject }),
      })

      if (response.ok) {
        const data = await response.json()
        setDeploymentUrl(data.url)
        alert(`Deployment successful! Your project is live at: ${data.url}`)
      } else {
        alert('Deployment failed')
      }
    } catch (error) {
      console.error('Error during deployment:', error)
      alert('An error occurred during deployment')
    }
  }

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ''
    setCode(newCode)
    if (socket) {
      socket.emit('codeChange', { room, code: newCode })
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <main className="flex h-screen bg-gray-100 text-gray-800">
      <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Project Explorer</h2>
        <div className="flex space-x-2 mb-4">
          <button
            onClick={handleNewFile}
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
          >
            New File
          </button>
          <button
            onClick={handleNewFolder}
            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
          >
            New Folder
          </button>
        </div>
        <div className="overflow-auto flex-grow">
          {renderFileSystem(fileSystem)}
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Aenzbi IDE</h1>
          <div className="flex items-center space-x-4">
            <span>{session.user?.email}</span>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Enter room name"
              className="px-2 py-1 border rounded"
            />
            <button
              onClick={handleSaveFile}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Save File
            </button>
            <button
              onClick={handleDeploy}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Deploy
            </button>
            <button
              onClick={() => signOut()}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Sign Out
            </button>
          </div>
        </nav>
        {deploymentUrl && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
            <p className="font-bold">Deployment Successful!</p>
            <p>Your project is live at: <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="underline">{deploymentUrl}</a></p>
          </div>
        )}
        <div className="flex-1 flex">
          <Resizable
            defaultSize={{ width: '50%', height: '100%' }}
            minWidth="20%"
            maxWidth="80%"
          >
            <div className="h-full border-r border-gray-200">
              <Editor
                height="100%"
                language={currentLanguage}
                value={code}
                onChange={handleCodeChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </div>
          </Resizable>
          <div className="flex-1 p-4 bg-black">
            <h3 className="text-lg font-semibold mb-2 text-white">Secure Terminal</h3>
            <div ref={terminalRef} className="h-full"></div>
          </div>
        </div>
      </div>
    </main>
  )
}
