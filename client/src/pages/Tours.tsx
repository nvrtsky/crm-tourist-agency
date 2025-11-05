import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Dashboard from "./Dashboard";
import Summary from "./Summary";
import Tourists from "./Tourists";

export default function Tours() {
  const { t } = useTranslation();

  return (
    <div className="h-full overflow-hidden">
      <Tabs defaultValue="summary" className="h-full flex flex-col">
        <TabsList className="mx-4 mt-4" data-testid="tabs-tours">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            {t("nav.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="summary" data-testid="tab-summary">
            {t("nav.table")}
          </TabsTrigger>
          <TabsTrigger value="tourists" data-testid="tab-tourists">
            {t("nav.addTourist")}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="flex-1 overflow-auto m-0">
          <Dashboard />
        </TabsContent>
        
        <TabsContent value="summary" className="flex-1 overflow-auto m-0">
          <Summary />
        </TabsContent>
        
        <TabsContent value="tourists" className="flex-1 overflow-auto m-0">
          <Tourists />
        </TabsContent>
      </Tabs>
    </div>
  );
}
