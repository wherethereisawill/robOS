import './App.css'
import { Button } from "@/components/ui/button"

function App() {

  return (
    <>
      <h1 className="mt-10 mb-10 text-left text-4xl font-bold">Robot OS</h1>
      <div className="flex flex-col items-center justify-center min-h-svh">
        <Button onClick={() => console.log('clicked')}>Click me</Button>
    </div>
    </>
  )
}

export default App