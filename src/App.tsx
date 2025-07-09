import { AppDataProvider } from "./providers/app-data-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import Layout from "./pages/_layout";

function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
        <Layout />
      </AppDataProvider>
    </ThemeProvider>
  );
}
export default App;
