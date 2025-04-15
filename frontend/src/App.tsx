import './App.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Setup from '@/components/Setup';
import Archive from '@/components/Archive';

function App() {

  return (
    <>
      <h1 className="mt-10 mb-10 text-left text-4xl font-bold">RobOS</h1>
      <Tabs defaultValue="setup" className="w-full">
      <TabsList className="mb-4">
          <TabsTrigger className="hover:cursor-pointer" value="setup">Setup</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="teleop">Teleop</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="datasets">Datasets</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="policies">Policies</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="archive">Archive</TabsTrigger>
      </TabsList>
      <TabsContent value="setup"><Setup /></TabsContent>
      <TabsContent value="teleop">Teleop.</TabsContent>
      <TabsContent value="datasets">Datasets.</TabsContent>
      <TabsContent value="policies">Policies.</TabsContent>
      <TabsContent value="archive"><Archive /></TabsContent>
      </Tabs>
    </>
  );
}

export default App;