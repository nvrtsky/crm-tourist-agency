import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import TouristCard from "@/components/TouristCard";
import TouristForm from "@/components/TouristForm";
import type { TouristWithVisits } from "@shared/schema";

export default function Tourists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  //todo: remove mock functionality
  const mockTourists: TouristWithVisits[] = [
    {
      id: "1",
      name: "Александр Иванов",
      email: "alex@example.com",
      phone: "+7 900 123-45-67",
      visits: [
        {
          id: "v1",
          touristId: "1",
          city: "Beijing",
          arrivalDate: "2025-06-15",
          transportType: "plane",
          hotelName: "Grand Hotel Beijing",
        },
        {
          id: "v2",
          touristId: "1",
          city: "Xian",
          arrivalDate: "2025-06-18",
          transportType: "train",
          hotelName: "Imperial Inn Xi'an",
        },
      ],
    },
    {
      id: "2",
      name: "Мария Петрова",
      email: "maria@example.com",
      phone: "+7 905 987-65-43",
      visits: [
        {
          id: "v3",
          touristId: "2",
          city: "Beijing",
          arrivalDate: "2025-06-15",
          transportType: "plane",
          hotelName: "Beijing Palace Hotel",
        },
        {
          id: "v4",
          touristId: "2",
          city: "Luoyang",
          arrivalDate: "2025-06-17",
          transportType: "train",
          hotelName: "Luoyang Grand",
        },
        {
          id: "v5",
          touristId: "2",
          city: "Zhangjiajie",
          arrivalDate: "2025-06-20",
          transportType: "plane",
          hotelName: "Mountain View Hotel",
        },
      ],
    },
    {
      id: "3",
      name: "Дмитрий Сидоров",
      email: "dmitry@example.com",
      phone: "+7 910 555-44-33",
      visits: [
        {
          id: "v6",
          touristId: "3",
          city: "Beijing",
          arrivalDate: "2025-06-16",
          transportType: "plane",
          hotelName: "Grand Hotel Beijing",
        },
        {
          id: "v7",
          touristId: "3",
          city: "Luoyang",
          arrivalDate: "2025-06-18",
          transportType: "train",
          hotelName: "Dragon Hotel",
        },
        {
          id: "v8",
          touristId: "3",
          city: "Xian",
          arrivalDate: "2025-06-20",
          transportType: "train",
          hotelName: "Xi'an Sheraton",
        },
        {
          id: "v9",
          touristId: "3",
          city: "Zhangjiajie",
          arrivalDate: "2025-06-23",
          transportType: "plane",
          hotelName: "Avatar Resort",
        },
      ],
    },
  ];

  const filteredTourists = mockTourists.filter((tourist) =>
    tourist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (data: any) => {
    console.log("New tourist:", data);
    setIsDialogOpen(false);
    alert("Турист успешно добавлен!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-page-title">
            Туристы
          </h1>
          <p className="text-muted-foreground mt-2">
            Управление списком туристов и их маршрутами
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-tourist">
              <Plus className="h-4 w-4 mr-2" />
              Добавить туриста
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новый турист</DialogTitle>
            </DialogHeader>
            <TouristForm
              onSubmit={handleSubmit}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск туристов по имени..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-tourists"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredTourists.map((tourist) => (
          <TouristCard
            key={tourist.id}
            tourist={tourist}
            onEdit={() => console.log("Edit tourist", tourist.id)}
            onDelete={() => {
              if (confirm("Удалить туриста?")) {
                console.log("Delete tourist", tourist.id);
              }
            }}
          />
        ))}
      </div>

      {filteredTourists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Туристы не найдены</p>
        </div>
      )}
    </div>
  );
}
