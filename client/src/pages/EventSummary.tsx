import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState, Fragment, useRef, useLayoutEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Users, UsersRound, Plus, UserMinus, UserPlus, Edit, Star, Baby, User as UserIcon, Plane, TrainFront, Bus, ChevronDown, Cake, MapPin, MessageSquare, Copy, X, Pencil } from "lucide-react";
import { useLocation } from "wouter";
import { utils, writeFile } from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { Event, Contact, Deal, CityVisit, Group, User, LeadTourist, Lead, EventParticipantExpense, EventCommonExpense, BaseExpense } from "@shared/schema";
import { updateLeadTouristSchema } from "@shared/schema";
import { EditableCell } from "@/components/EditableCell";
import { PassportScansField } from "@/components/PassportScansField";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { TOURIST_FIELD_DESCRIPTORS, SECTION_TITLES } from "@/lib/touristFormConfig";
import { DataCompletenessIndicator } from "@/components/DataCompletenessIndicator";
import { calculateTouristDataCompleteness, formatCurrency, formatTouristName, getCurrencySymbol } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import { LeadEditModal } from "@/components/LeadEditModal";

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  contacted: "Квалифицирован",
  qualified: "Забронирован",
  converted: "Подтвержден",
  lost: "Отложен",
};

interface EventWithStats extends Event {
  bookedCount: number;
  availableSpots: number;
}

interface Participant {
  deal: Deal;
  contact: Contact;
  leadTourist: LeadTourist | null;
  lead: Lead | null;
  visits: CityVisit[];
  group: Group | null;
}

const createMiniGroupSchema = z.object({
  name: z.string().min(1, "Введите название группы"),
  dealIds: z.array(z.string()).min(2, "Выберите минимум 2 участников"),
  primaryDealId: z.string().min(1, "Выберите основного участника"),
});

type CreateMiniGroupFormData = z.infer<typeof createMiniGroupSchema>;

interface TransportTypeSelectorProps {
  value: string | null | undefined;
  onSave: (value: string | null) => void;
  className?: string;
  testIdSuffix?: string;
}

function TransportTypeSelector({ value, onSave, className, testIdSuffix = '' }: TransportTypeSelectorProps) {
  return (
    <div className={`flex gap-1 ${className || ''}`}>
      <Button
        type="button"
        size="icon"
        variant={value === "plane" ? "default" : "ghost"}
        onClick={() => onSave(value === "plane" ? null : "plane")}
        aria-label="Самолет"
        data-testid={`button-transport-plane${testIdSuffix}`}
        className="h-6 w-6"
      >
        <Plane className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={value === "train" ? "default" : "ghost"}
        onClick={() => onSave(value === "train" ? null : "train")}
        aria-label="Поезд"
        data-testid={`button-transport-train${testIdSuffix}`}
        className="h-6 w-6"
      >
        <TrainFront className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={value === "bus" ? "default" : "ghost"}
        onClick={() => onSave(value === "bus" ? null : "bus")}
        aria-label="Автобус"
        data-testid={`button-transport-bus${testIdSuffix}`}
        className="h-6 w-6"
      >
        <Bus className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface ParticipantCardProps {
  participant: Participant;
  index: number;
  cities: string[];
  getGuideName: (city: string) => string | null;
  handleVisitUpdate: (visitId: string | undefined, dealId: string, city: string, field: string, value: string | null) => void;
  handleEditTourist: (contactId: string | undefined, participant?: Participant) => void;
  canEditTourist: (participant: Participant) => boolean;
  handleRemoveFromGroup: (groupId: string, dealId: string) => void;
  removeFromGroupPending: boolean;
  lead: Lead | null;
  getLeadStatusStyle: (status: string) => { variant: any; customClass?: string };
  groupInfo?: { type: 'family' | 'mini_group'; name?: string; memberCount: number };
  sharedFields?: { arrival: boolean; hotel: boolean; departure: boolean };
  sharedVisits?: CityVisit[];
  groupMembers?: Participant[];
  hasBirthday?: boolean;
}

function ParticipantCard({
  participant,
  index,
  cities,
  getGuideName,
  handleVisitUpdate,
  handleEditTourist,
  canEditTourist,
  handleRemoveFromGroup,
  removeFromGroupPending,
  lead,
  getLeadStatusStyle,
  groupInfo,
  sharedFields,
  sharedVisits,
  groupMembers,
  hasBirthday,
}: ParticipantCardProps) {
  return (
    <Card className={`mb-4 ${groupInfo ? 'border-l-4 border-l-primary/30' : ''} ${hasBirthday ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800' : ''}`} data-testid={`card-participant-${participant.deal.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
              {groupInfo && groupInfo.type === 'family' && groupMembers && groupMembers.length > 1 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="inline-flex"
                      data-testid={`button-family-header-${participant.deal.id}`}
                    >
                      <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover-elevate rounded px-2 py-1">
                        <UsersRound className="h-4 w-4" />
                        {hasBirthday && <Cake className="h-4 w-4 text-pink-500" />}
                        Семья ({groupInfo.memberCount} чел.)
                        <ChevronDown className="h-3 w-3" />
                      </CardTitle>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" data-testid={`popover-family-members-${participant.deal.id}`}>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Члены семьи</h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {groupMembers.map((member) => (
                          <div 
                            key={member.deal.id} 
                            className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate"
                            data-testid={`family-member-${member.deal.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {formatTouristName(member.leadTourist, member.contact?.name)}
                                </span>
                                {member.leadTourist?.isPrimary && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                                    <Star className="h-2.5 w-2.5 mr-0.5" />
                                    Основной
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {member.leadTourist && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                    {member.leadTourist.touristType === "adult" ? (
                                      <><UserIcon className="h-2.5 w-2.5 mr-0.5 text-muted-foreground" />Взрослый</>
                                    ) : member.leadTourist.touristType === "child" ? (
                                      <><UserIcon className="h-2.5 w-2.5 mr-0.5 text-blue-500 dark:text-blue-400" />Ребенок</>
                                    ) : (
                                      <><Baby className="h-2.5 w-2.5 mr-0.5 text-pink-500 dark:text-pink-400" />Младенец</>
                                    )}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {canEditTourist(member) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleEditTourist(member.contact?.id, member)}
                                data-testid={`button-edit-family-member-${member.deal.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <CardTitle className="text-base flex items-center gap-2">
                  {hasBirthday && <Cake className="h-4 w-4 text-pink-500" />}
                  {formatTouristName(participant.leadTourist, participant.contact?.name)}
                </CardTitle>
              )}
              {groupInfo && groupInfo.type === 'mini_group' && groupMembers && groupMembers.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="inline-flex"
                      data-testid={`button-group-members-${participant.deal.id}`}
                    >
                      <Badge 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover-elevate"
                      >
                        <UsersRound className="h-3 w-3 mr-1" />
                        {groupInfo.name || `Группа (${groupInfo.memberCount})`}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Badge>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" data-testid={`popover-group-members-${participant.deal.id}`}>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">
                        Группа: {groupInfo.name || 'Мини-группа'}
                      </h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {groupMembers.map((member, idx) => (
                          <div 
                            key={member.deal.id} 
                            className={`flex items-center justify-between gap-2 p-2 rounded-md border ${member.deal.id === participant.deal.id ? 'bg-muted border-primary' : 'border-border'}`}
                            data-testid={`group-member-${member.deal.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {formatTouristName(member.leadTourist, member.contact?.name)}
                                </span>
                                {member.leadTourist?.isPrimary && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                                    <Star className="h-2.5 w-2.5 mr-0.5" />
                                    Основной
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {member.leadTourist && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                    {member.leadTourist.touristType === "adult" ? (
                                      <><UserIcon className="h-2.5 w-2.5 mr-0.5 text-muted-foreground" />Взрослый</>
                                    ) : member.leadTourist.touristType === "child" ? (
                                      <><UserIcon className="h-2.5 w-2.5 mr-0.5 text-blue-500 dark:text-blue-400" />Ребенок</>
                                    ) : (
                                      <><Baby className="h-2.5 w-2.5 mr-0.5 text-pink-500 dark:text-pink-400" />Младенец</>
                                    )}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {canEditTourist(member) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleEditTourist(member.contact?.id, member)}
                                data-testid={`button-edit-member-${member.deal.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {participant.leadTourist && (
                <>
                  <Badge variant="outline" className="text-xs" data-testid={`badge-tourist-type-${participant.deal.id}`}>
                    {participant.leadTourist.touristType === "adult" ? (
                      <><UserIcon className="h-3 w-3 mr-1 text-muted-foreground" />Взрослый</>
                    ) : participant.leadTourist.touristType === "child" ? (
                      <><UserIcon className="h-3 w-3 mr-1 text-blue-500 dark:text-blue-400" />Ребенок</>
                    ) : (
                      <><Baby className="h-3 w-3 mr-1 text-pink-500 dark:text-pink-400" />Младенец</>
                    )}
                  </Badge>
                  {participant.leadTourist.isPrimary && (
                    <Badge variant="default" className="text-xs" data-testid={`badge-primary-tourist-${participant.deal.id}`}>
                      <Star className="h-3 w-3 mr-1" />Основной
                    </Badge>
                  )}
                </>
              )}
              {participant.leadTourist && (
                <DataCompletenessIndicator 
                  completeness={calculateTouristDataCompleteness(participant.leadTourist)} 
                />
              )}
              {lead && (() => {
                const style = getLeadStatusStyle(lead.status);
                return (
                  <Link href="/leads" data-testid={`link-lead-${lead.id}`}>
                    <Badge 
                      variant={style.variant}
                      className={`text-xs cursor-pointer hover-elevate ${style.customClass || ''}`}
                    >
                      {LEAD_STATUS_LABELS[lead.status] || lead.status}
                    </Badge>
                  </Link>
                );
              })()}
            </div>
          </div>
          <div className="flex gap-1">
            {canEditTourist(participant) && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleEditTourist(participant.contact?.id, participant)}
                data-testid={`button-edit-tourist-${participant.deal.id}`}
                className="h-6 w-6"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {participant.deal.groupId && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const displayName = formatTouristName(participant.leadTourist, participant.contact?.name);
                  if (confirm(`Удалить ${displayName} из группы?`)) {
                    handleRemoveFromGroup(participant.deal.groupId!, participant.deal.id);
                  }
                }}
                disabled={removeFromGroupPending}
                data-testid={`button-remove-from-group-${participant.deal.id}`}
                className="h-6 w-6"
              >
                <UserMinus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="multiple" className="w-full">
          {cities.map((city) => {
            // For each section, determine the visit source based on shared field flags
            const arrivalVisitsSource = (sharedFields?.arrival ? sharedVisits : participant.visits) || [];
            const hotelVisitsSource = (sharedFields?.hotel ? sharedVisits : participant.visits) || [];
            const departureVisitsSource = (sharedFields?.departure ? sharedVisits : participant.visits) || [];
            
            const arrivalVisit = arrivalVisitsSource.find((v) => v.city === city);
            const hotelVisit = hotelVisitsSource.find((v) => v.city === city);
            const departureVisit = departureVisitsSource.find((v) => v.city === city);
            
            const guideName = getGuideName(city);
            
            return (
              <AccordionItem key={city} value={city} data-testid={`accordion-city-${city}-${participant.deal.id}`}>
                <AccordionTrigger className="text-sm font-medium hover-elevate">
                  <div className="flex items-center justify-between w-full pr-2">
                    <span>{city}</span>
                    {guideName && (
                      <span className="text-xs text-muted-foreground font-normal">
                        Гид: {guideName}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-muted-foreground">Прибытие</h4>
                        {sharedFields?.arrival && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                            <UsersRound className="h-2.5 w-2.5 mr-1" />
                            Общее
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <EditableCell
                            type="date"
                            value={arrivalVisit?.arrivalDate}
                            placeholder="Дата"
                            onSave={(value) => handleVisitUpdate(arrivalVisit?.id, participant.deal.id, city, "arrivalDate", value)}
                            className="text-sm flex-1"
                          />
                          <EditableCell
                            type="time"
                            value={arrivalVisit?.arrivalTime}
                            placeholder="Время"
                            onSave={(value) => handleVisitUpdate(arrivalVisit?.id, participant.deal.id, city, "arrivalTime", value)}
                            className="text-sm flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <TransportTypeSelector
                            value={arrivalVisit?.transportType}
                            onSave={(value) => handleVisitUpdate(arrivalVisit?.id, participant.deal.id, city, "transportType", value)}
                            testIdSuffix={`-${participant.deal.id}-${city}-arrival`}
                          />
                          <EditableCell
                            type="text"
                            value={arrivalVisit?.flightNumber}
                            placeholder="№ рейса"
                            onSave={(value) => handleVisitUpdate(arrivalVisit?.id, participant.deal.id, city, "flightNumber", value)}
                            className="text-sm flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <EditableCell
                            type="text"
                            value={arrivalVisit?.airport}
                            placeholder={arrivalVisit?.transportType === "plane" ? "Аэропорт" : arrivalVisit?.transportType === "bus" ? "Автостанция" : "Вокзал"}
                            onSave={(value) => handleVisitUpdate(arrivalVisit?.id, participant.deal.id, city, "airport", value)}
                            className="text-sm flex-1"
                          />
                          <EditableCell
                            type="text"
                            value={arrivalVisit?.transfer}
                            placeholder="Трансфер"
                            onSave={(value) => handleVisitUpdate(arrivalVisit?.id, participant.deal.id, city, "transfer", value)}
                            className="text-sm flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-muted-foreground">Отель</h4>
                        {sharedFields?.hotel && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                            <UsersRound className="h-2.5 w-2.5 mr-1" />
                            Общее
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <EditableCell
                          type="text"
                          value={hotelVisit?.hotelName}
                          placeholder="Название отеля"
                          onSave={(value) => handleVisitUpdate(hotelVisit?.id, participant.deal.id, city, "hotelName", value)}
                          className="text-sm w-full"
                        />
                        <EditableCell
                          type="text"
                          value={hotelVisit?.roomType}
                          placeholder="Тип номера"
                          onSave={(value) => handleVisitUpdate(hotelVisit?.id, participant.deal.id, city, "roomType", value)}
                          className="text-sm w-full"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-muted-foreground">Отъезд</h4>
                        {sharedFields?.departure && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                            <UsersRound className="h-2.5 w-2.5 mr-1" />
                            Общее
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <EditableCell
                            type="date"
                            value={departureVisit?.departureDate}
                            placeholder="Дата"
                            onSave={(value) => handleVisitUpdate(departureVisit?.id, participant.deal.id, city, "departureDate", value)}
                            className="text-sm flex-1"
                          />
                          <EditableCell
                            type="time"
                            value={departureVisit?.departureTime}
                            placeholder="Время"
                            onSave={(value) => handleVisitUpdate(departureVisit?.id, participant.deal.id, city, "departureTime", value)}
                            className="text-sm flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <TransportTypeSelector
                            value={departureVisit?.departureTransportType}
                            onSave={(value) => handleVisitUpdate(departureVisit?.id, participant.deal.id, city, "departureTransportType", value)}
                            testIdSuffix={`-${participant.deal.id}-${city}-departure`}
                          />
                          <EditableCell
                            type="text"
                            value={departureVisit?.departureFlightNumber}
                            placeholder="№ рейса"
                            onSave={(value) => handleVisitUpdate(departureVisit?.id, participant.deal.id, city, "departureFlightNumber", value)}
                            className="text-sm flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <EditableCell
                            type="text"
                            value={departureVisit?.departureAirport}
                            placeholder={departureVisit?.departureTransportType === "plane" ? "Аэропорт" : departureVisit?.departureTransportType === "bus" ? "Автостанция" : "Вокзал"}
                            onSave={(value) => handleVisitUpdate(departureVisit?.id, participant.deal.id, city, "departureAirport", value)}
                            className="text-sm flex-1"
                          />
                          <EditableCell
                            type="text"
                            value={departureVisit?.departureTransfer}
                            placeholder="Трансфер"
                            onSave={(value) => handleVisitUpdate(departureVisit?.id, participant.deal.id, city, "departureTransfer", value)}
                            className="text-sm flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// Helper function to check if birthday falls within tour dates
function hasBirthdayDuringTour(dateOfBirth: string | null | undefined, tourStartDate: string | null | undefined, tourEndDate: string | null | undefined): boolean {
  // Guard against missing data
  if (!dateOfBirth || !tourStartDate || !tourEndDate) {
    return false;
  }
  
  try {
    const dob = new Date(dateOfBirth);
    const tourStart = new Date(tourStartDate);
    const tourEnd = new Date(tourEndDate);
    
    // Validate dates
    if (isNaN(dob.getTime()) || isNaN(tourStart.getTime()) || isNaN(tourEnd.getTime())) {
      return false;
    }
    
    // Get the birth month and day
    const birthMonth = dob.getMonth();
    const birthDay = dob.getDate();
    
    // Check each year that could overlap with the tour
    const tourStartYear = tourStart.getFullYear();
    const tourEndYear = tourEnd.getFullYear();
    
    for (let year = tourStartYear; year <= tourEndYear; year++) {
      const birthdayThisYear = new Date(year, birthMonth, birthDay);
      
      // Check if birthday falls within tour dates
      if (birthdayThisYear >= tourStart && birthdayThisYear <= tourEnd) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking birthday during tour:', error);
    return false;
  }
}

export default function EventSummary() {
  const [, params] = useRoute("/events/:id/summary");
  const [, setLocation] = useLocation();
  const eventId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [expenseCurrency, setExpenseCurrency] = useState<"CNY" | "EUR">("CNY");
  const [showBaseExpenseDialog, setShowBaseExpenseDialog] = useState(false);
  const [editingBaseExpense, setEditingBaseExpense] = useState<BaseExpense | null>(null);
  const [baseExpenseForm, setBaseExpenseForm] = useState({ name: "", amount: "", currency: "CNY", category: "" });
  const [baseExpenseFilter, setBaseExpenseFilter] = useState("");
  const [showAddExpenseFromCatalog, setShowAddExpenseFromCatalog] = useState(false);
  const [selectedCityForExpense, setSelectedCityForExpense] = useState<string>("");
  const [selectedDealForExpense, setSelectedDealForExpense] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  
  // Currency conversion rates (approximate)
  const conversionRates: Record<string, Record<string, number>> = {
    RUB: { CNY: 0.076, EUR: 0.0095 },
    USD: { CNY: 7.25, EUR: 0.92 },
    CNY: { CNY: 1, EUR: 0.127 },
    EUR: { CNY: 7.88, EUR: 1 },
  };
  
  const convertToCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    const rate = conversionRates[fromCurrency]?.[toCurrency];
    if (!rate) return 0;
    return amount * rate;
  };
  
  // Measure first sticky column width dynamically
  const firstColumnRef = useRef<HTMLTableCellElement>(null);
  const [stickyOffset, setStickyOffset] = useState<number>(56);
  
  // Track recently created expenses to ignore blur events during re-render
  const recentlyCreatedExpenses = useRef<Set<string>>(new Set());

  const { data: event, isLoading: eventLoading } = useQuery<EventWithStats>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  // Load viewer users for displaying guide names
  const { data: viewers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/viewers"],
    enabled: !!event,
  });

  const { data: rawParticipants = [], isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: [`/api/events/${eventId}/participants`],
    enabled: !!eventId,
  });

  // Fetch event expenses for finance tab
  interface ExpensesResponse {
    participantExpenses: EventParticipantExpense[];
    commonExpenses: EventCommonExpense[];
  }
  const { data: expensesData } = useQuery<ExpensesResponse>({
    queryKey: [`/api/events/${eventId}/expenses`],
    enabled: !!eventId,
  });
  const participantExpenses = expensesData?.participantExpenses ?? [];
  const commonExpenses = expensesData?.commonExpenses ?? [];

  // Fetch base expenses catalog for the expenses tab
  const { data: baseExpenses = [] } = useQuery<BaseExpense[]>({
    queryKey: ["/api/base-expenses"],
    enabled: user?.role === "admin",
  });

  // Mutations for base expenses CRUD
  const createBaseExpenseMutation = useMutation({
    mutationFn: async (data: { name: string; amount: string; currency: string; category: string | null }) => {
      return apiRequest("POST", "/api/base-expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/base-expenses"] });
    },
  });

  const updateBaseExpenseMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; amount?: string; currency?: string; category?: string | null }) => {
      const { id, ...updateData } = data;
      return apiRequest("PATCH", `/api/base-expenses/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/base-expenses"] });
    },
  });

  const deleteBaseExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/base-expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/base-expenses"] });
    },
  });

  // Mutation for upserting participant expense
  const upsertParticipantExpenseMutation = useMutation({
    mutationFn: async (data: { dealId: string; city: string; expenseType: string; amount?: string; currency?: string; comment?: string }) => {
      return apiRequest("PUT", `/api/events/${eventId}/expenses/participant`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/expenses`] });
    },
  });

  // Mutation for upserting common expense
  const upsertCommonExpenseMutation = useMutation({
    mutationFn: async (data: { city: string; expenseType: string; amount?: string; currency?: string; comment?: string }) => {
      return apiRequest("PUT", `/api/events/${eventId}/expenses/common`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/expenses`] });
    },
  });

  // Mutation for deleting participant expense
  const deleteParticipantExpenseMutation = useMutation({
    mutationFn: async (data: { dealId: string; city: string; expenseType: string; silent?: boolean }) => {
      const { silent, ...apiData } = data;
      return apiRequest("DELETE", `/api/events/${eventId}/expenses/participant`, apiData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/expenses`] });
      if (!variables.silent) {
        toast({ title: "Расход удален" });
      }
    },
  });

  // Mutation for deleting common expense
  const deleteCommonExpenseMutation = useMutation({
    mutationFn: async (data: { city: string; expenseType: string; silent?: boolean }) => {
      const { silent, ...apiData } = data;
      return apiRequest("DELETE", `/api/events/${eventId}/expenses/common`, apiData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/expenses`] });
      if (!variables.silent) {
        toast({ title: "Расход удален" });
      }
    },
  });

  // Mutation for updating deal (paidAmount)
  const updateDealMutation = useMutation({
    mutationFn: async (data: { dealId: string; paidAmount?: string }) => {
      return apiRequest("PATCH", `/api/deals/${data.dealId}`, { paidAmount: data.paidAmount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
    },
  });

  // Mutation for updating lead (financial fields)
  const updateLeadMutation = useMutation({
    mutationFn: async (data: { 
      leadId: string; 
      tourCost?: string; 
      tourCostCurrency?: string;
      advancePayment?: string; 
      advancePaymentCurrency?: string;
      remainingPayment?: string;
      remainingPaymentCurrency?: string;
    }) => {
      const { leadId, ...updateData } = data;
      return apiRequest("PATCH", `/api/leads/${leadId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
    },
  });

  // Helper to get all participant expenses for dealId + city
  const getParticipantExpenses = (dealId: string, city: string) => {
    return participantExpenses.filter(
      e => e.dealId === dealId && e.city === city
    );
  };
  
  // Helper to get participant expense (finds any expense for dealId + city) - for backward compatibility
  const getParticipantExpense = (dealId: string, city: string) => {
    return participantExpenses.find(
      e => e.dealId === dealId && e.city === city
    );
  };

  // Helper to get all common expenses for city
  const getCommonExpensesForCity = (city: string) => {
    return commonExpenses.filter(
      e => e.city === city
    );
  };
  
  // Helper to get common expense (finds any expense for city) - for backward compatibility
  const getCommonExpense = (city: string) => {
    return commonExpenses.find(
      e => e.city === city
    );
  };
  
  // PARTICIPANT_EXPENSE_TYPES labels
  const EXPENSE_TYPE_LABELS: Record<string, string> = {
    accommodation: "Проживание",
    excursions: "Экскурсии", 
    meals: "Питание",
    transport: "Внутренний транспорт",
    tickets: "Входные билеты",
    other: "Прочее",
  };
  
  // COMMON_EXPENSE_TYPES labels
  const COMMON_EXPENSE_TYPE_LABELS: Record<string, string> = {
    guide: "Гид/Сопровождающий",
    bus: "Аренда автобуса",
    insurance: "Страховка",
    visa: "Визовые сборы",
    other: "Прочее",
  };

  // Sort participants by: (1) confirmed leads first, (2) leadId, (3) isPrimary, (4) groupId, (5) isPrimaryInGroup
  // This ensures confirmed participants appear at the top while maintaining group relationships
  const participants = rawParticipants.slice().sort((a, b) => {
    const aIsConfirmed = a.lead?.status === "converted";
    const bIsConfirmed = b.lead?.status === "converted";
    const aLeadId = a.contact?.leadId ?? '';
    const bLeadId = b.contact?.leadId ?? '';
    const aGroupId = a.deal.groupId ?? '';
    const bGroupId = b.deal.groupId ?? '';
    const aIsPrimary = a.leadTourist?.isPrimary || false;
    const bIsPrimary = b.leadTourist?.isPrimary || false;
    const aIsPrimaryInGroup = a.deal.isPrimaryInGroup || false;
    const bIsPrimaryInGroup = b.deal.isPrimaryInGroup || false;
    
    // First: sort by confirmed status (confirmed participants first)
    if (aIsConfirmed !== bIsConfirmed) {
      return aIsConfirmed ? -1 : 1;
    }
    
    // Second: compare by leadId (empty string sorts equally with other empty strings)
    if (aLeadId !== bLeadId) {
      return aLeadId.localeCompare(bLeadId);
    }
    
    // Third: same leadId (including both empty) - compare by isPrimary
    if (aIsPrimary !== bIsPrimary) {
      return aIsPrimary ? -1 : 1;
    }
    
    // Fourth: same leadId and primary status - compare by groupId
    if (aGroupId !== bGroupId) {
      return aGroupId.localeCompare(bGroupId);
    }
    
    // Fifth: same groupId - compare by isPrimaryInGroup
    if (aIsPrimaryInGroup !== bIsPrimaryInGroup) {
      return aIsPrimaryInGroup ? -1 : 1;
    }
    
    return 0;
  });

  // Measure the actual width of the first sticky column
  useLayoutEffect(() => {
    const measureWidth = () => {
      if (firstColumnRef.current) {
        const width = firstColumnRef.current.offsetWidth;
        setStickyOffset(width);
      }
    };
    
    measureWidth();
    window.addEventListener('resize', measureWidth);
    
    return () => {
      window.removeEventListener('resize', measureWidth);
    };
  }, [participants.length]); // Re-measure when participants change
  
  // Pre-compute first participant indices for each lead and group
  // This ensures rowSpan merging works even when isPrimary/isPrimaryInGroup flags are missing
  const leadFirstIndexMap = new Map<string, number>();
  const groupFirstIndexMap = new Map<string, number>();
  
  participants.forEach((p, index) => {
    const leadId = p.contact?.leadId;
    const groupId = p.deal.groupId;
    
    if (leadId && !leadFirstIndexMap.has(leadId)) {
      leadFirstIndexMap.set(leadId, index);
    }
    
    if (groupId && !groupFirstIndexMap.has(groupId)) {
      groupFirstIndexMap.set(groupId, index);
    }
  });

  // Create viewer map for quick guide name lookups
  const viewerMap = new Map(
    viewers.map(v => [v.id, `${v.firstName} ${v.lastName}`])
  );

  // Helper to get guide name for a city
  const getGuideName = (city: string): string | null => {
    if (!event?.cityGuides) return null;
    const cityGuides = event.cityGuides as Record<string, string>;
    const guideId = cityGuides[city];
    return guideId ? viewerMap.get(guideId) || null : null;
  };

  // Helper to build display metadata for each participant's city columns
  // Determines which columns to show and with what rowSpan based on lead/mini-group membership
  const buildCityColumnsMeta = (participant: Participant, leadId: string | null | undefined, leadSize: number, isFirstInLead: boolean, isMiniGroup: boolean, isFirstInMiniGroup: boolean, groupSize: number) => {
    // Priority: Lead merge > Mini-group hotel merge > Individual rendering
    
    // Scenario 1: Participant is part of a lead (family)
    // Merge ALL 3 columns (Arrival, Hotel, Departure)
    if (leadId && leadSize > 1) {
      if (isFirstInLead) {
        // First tourist in lead - show all columns with rowSpan
        return {
          showArrival: true,
          arrivalRowSpan: leadSize,
          showHotel: true,
          hotelRowSpan: leadSize,
          showDeparture: true,
          departureRowSpan: leadSize,
        };
      } else {
        // Not first tourist in lead - hide all columns (already shown in first row)
        return {
          showArrival: false,
          arrivalRowSpan: 1,
          showHotel: false,
          hotelRowSpan: 1,
          showDeparture: false,
          departureRowSpan: 1,
        };
      }
    }
    
    // Scenario 2: Participant is in mini-group (but NOT in lead, or lead has only 1 member)
    // Merge ONLY Hotel column
    if (isMiniGroup && groupSize > 1) {
      if (isFirstInMiniGroup) {
        // First participant in mini-group - show all columns, Hotel with rowSpan
        return {
          showArrival: true,
          arrivalRowSpan: 1,
          showHotel: true,
          hotelRowSpan: groupSize,
          showDeparture: true,
          departureRowSpan: 1,
        };
      } else {
        // Not first in mini-group - show all except Hotel
        return {
          showArrival: true,
          arrivalRowSpan: 1,
          showHotel: false,
          hotelRowSpan: 1,
          showDeparture: true,
          departureRowSpan: 1,
        };
      }
    }
    
    // Default: Individual rendering (no merging)
    return {
      showArrival: true,
      arrivalRowSpan: 1,
      showHotel: true,
      hotelRowSpan: 1,
      showDeparture: true,
      departureRowSpan: 1,
    };
  };

  const updateVisitMutation = useMutation({
    mutationFn: async ({ visitId, updates }: { visitId: string; updates: Partial<CityVisit> }) => {
      return apiRequest("PATCH", `/api/visits/${visitId}`, updates);
    },
    onMutate: async ({ visitId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData([`/api/events/${eventId}/participants`]);
      
      // Optimistically update to the new value
      queryClient.setQueryData([`/api/events/${eventId}/participants`], (old: any) => {
        if (!old) return old;
        return old.map((participant: any) => ({
          ...participant,
          visits: participant.visits?.map((visit: any) => 
            visit.id === visitId ? { ...visit, ...updates } : visit
          )
        }));
      });
      
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData([`/api/events/${eventId}/participants`], context.previousData);
      }
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Сохранено",
        description: "Данные обновлены",
      });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: async ({ dealId, visitData }: { dealId: string; visitData: Partial<CityVisit> & { city: string } }) => {
      // Build payload without forcing default values - allows creating visits with departure data only
      const payload: Record<string, any> = { city: visitData.city };
      
      // Only include fields that have actual values
      if (visitData.arrivalDate) payload.arrivalDate = visitData.arrivalDate;
      if (visitData.arrivalTime) payload.arrivalTime = visitData.arrivalTime;
      if (visitData.transportType) payload.transportType = visitData.transportType;
      if (visitData.flightNumber) payload.flightNumber = visitData.flightNumber;
      if (visitData.airport) payload.airport = visitData.airport;
      if (visitData.transfer) payload.transfer = visitData.transfer;
      if (visitData.departureDate) payload.departureDate = visitData.departureDate;
      if (visitData.departureTime) payload.departureTime = visitData.departureTime;
      if (visitData.departureTransportType) payload.departureTransportType = visitData.departureTransportType;
      if (visitData.departureFlightNumber) payload.departureFlightNumber = visitData.departureFlightNumber;
      if (visitData.departureAirport) payload.departureAirport = visitData.departureAirport;
      if (visitData.departureTransfer) payload.departureTransfer = visitData.departureTransfer;
      if (visitData.hotelName) payload.hotelName = visitData.hotelName;
      if (visitData.roomType) payload.roomType = visitData.roomType;
      
      return apiRequest("POST", `/api/deals/${dealId}/visits`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Создано",
        description: "Новое посещение добавлено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать посещение",
        variant: "destructive",
      });
    },
  });

  const createMiniGroupMutation = useMutation({
    mutationFn: async (data: CreateMiniGroupFormData) => {
      if (!eventId) throw new Error("Event ID is required");
      
      let createdGroupId: string | null = null;
      try {
        const groupResponse = await apiRequest("POST", "/api/groups", {
          name: data.name,
          type: "mini_group",
          eventId,
        });
        const group = await groupResponse.json() as Group;
        createdGroupId = group.id;

        // Add all members
        for (const dealId of data.dealIds) {
          await apiRequest("POST", `/api/groups/${group.id}/members`, {
            dealId,
            isPrimary: dealId === data.primaryDealId,
          });
        }

        return group;
      } catch (error) {
        // Rollback: delete the group if it was created but member addition failed
        if (createdGroupId) {
          try {
            await apiRequest("DELETE", `/api/groups/${createdGroupId}`);
          } catch (rollbackError) {
            console.error("Failed to rollback group creation:", rollbackError);
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Успешно",
        description: "Мини-группа создана",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось создать мини-группу",
        variant: "destructive",
      });
    },
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ groupId, dealId }: { groupId: string; dealId: string }) => {
      return apiRequest("DELETE", `/api/groups/${groupId}/members/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Успешно",
        description: "Участник удален из группы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось удалить участника из группы",
        variant: "destructive",
      });
    },
  });

  // Check if current user can edit a tourist from this lead
  const canEditTourist = (participant: Participant): boolean => {
    if (!user) return false;
    
    // Admins and viewers can edit all tourists
    if (user.role === 'admin' || user.role === 'viewer') {
      return true;
    }
    
    // Managers can only edit tourists from their assigned leads
    if (user.role === 'manager') {
      const lead = participant.lead;
      // If no lead or lead assignment is missing, deny access for security
      if (!lead) return false;
      return lead.assignedUserId === user.id;
    }
    
    return false;
  };

  const handleEditTourist = (contactId: string | undefined, participant?: Participant) => {
    if (!contactId) {
      toast({
        title: "Ошибка",
        description: "ID контакта не найден",
        variant: "destructive",
      });
      return;
    }
    
    // Check edit permissions if participant is provided
    if (participant && !canEditTourist(participant)) {
      toast({
        title: "Нет доступа",
        description: "У вас нет прав для редактирования этого туриста",
        variant: "destructive",
      });
      return;
    }
    
    setEditingContactId(contactId);
  };

  const handleVisitUpdate = (visitId: string | undefined, dealId: string, city: string, field: string, value: string | null) => {
    // Find the participant
    const participant = participants.find(p => p.deal.id === dealId);
    if (!participant) return;

    const leadId = participant.contact?.leadId;
    const groupId = participant.deal.groupId;
    const group = participant.group;
    
    // Determine if we need to apply updates to multiple participants
    let targetMembers: typeof participants = [];
    let isLeadUpdate = false;
    
    // Priority 1: If participant is from a multi-member lead (family), update ALL fields for ALL tourists
    if (leadId) {
      const leadMembers = participants.filter(p => p.contact?.leadId === leadId);
      if (leadMembers.length > 1) {
        targetMembers = leadMembers;
        isLeadUpdate = true;
      }
    }
    
    // Priority 2: If no multi-member lead, check mini-group hotel sharing
    const hotelFields = ['hotelName', 'roomType'];
    if (!isLeadUpdate && groupId && group?.type === 'mini_group' && hotelFields.includes(field)) {
      const groupMembers = participants.filter(p => p.deal.groupId === groupId);
      if (groupMembers.length > 1) {
        targetMembers = groupMembers;
      }
    }
    
    // Apply update to target members (or just this participant if no group sharing)
    const membersToUpdate = targetMembers.length > 0 ? targetMembers : [participant];
    
    membersToUpdate.forEach(member => {
      const memberVisit = member.visits?.find(v => v.city === city);
      
      if (memberVisit?.id) {
        updateVisitMutation.mutate({ 
          visitId: memberVisit.id, 
          updates: { [field]: value || null } 
        });
      } else {
        // Create new visit - build payload first with undefined values, then set the actual field
        const visitPayload: any = {
          city,
          arrivalDate: undefined,
          arrivalTime: undefined,
          transportType: undefined,
          flightNumber: undefined,
          hotelName: undefined,
          roomType: undefined,
          departureDate: undefined,
          departureTime: undefined,
        };
        // Set the actual field value AFTER object creation to avoid overwrite
        visitPayload[field] = value || undefined;
        
        createVisitMutation.mutate({
          dealId: member.deal.id,
          visitData: visitPayload,
        });
      }
    });
    
    // Auto-fill arrival fields of next city when departure fields are updated
    // Map departure fields to corresponding arrival fields
    const departureToArrivalMap: Record<string, string> = {
      'departureDate': 'arrivalDate',
      'departureTime': 'arrivalTime',
      'departureTransportType': 'transportType',
      'departureFlightNumber': 'flightNumber',
      'departureAirport': 'airport',
      'departureTransfer': 'transfer',
    };
    
    // Only process if this is a departure field and we have a value
    if (field in departureToArrivalMap && value && event?.cities) {
      const currentCityIndex = event.cities.indexOf(city);
      const nextCity = currentCityIndex >= 0 && currentCityIndex < event.cities.length - 1 
        ? event.cities[currentCityIndex + 1] 
        : null;
      
      if (nextCity) {
        const arrivalField = departureToArrivalMap[field];
        
        // Update arrival field in next city for all target members (only if empty)
        membersToUpdate.forEach(member => {
          const nextCityVisit = member.visits?.find(v => v.city === nextCity);
          
          // Check if the arrival field is empty (null, undefined, or empty string)
          const currentArrivalValue = nextCityVisit ? (nextCityVisit as any)[arrivalField] : null;
          const isArrivalFieldEmpty = !currentArrivalValue || currentArrivalValue === '';
          
          if (isArrivalFieldEmpty) {
            if (nextCityVisit?.id) {
              // Update existing visit
              updateVisitMutation.mutate({ 
                visitId: nextCityVisit.id, 
                updates: { [arrivalField]: value } 
              });
            } else {
              // Create new visit for next city with auto-filled arrival data
              // Build payload dynamically to avoid overwriting the mapped field with undefined
              const visitPayload: any = {
                city: nextCity,
                arrivalDate: undefined,
                arrivalTime: undefined,
                transportType: undefined,
                flightNumber: undefined,
                hotelName: undefined,
                roomType: undefined,
                departureDate: undefined,
                departureTime: undefined,
              };
              // Set the arrival field with the copied value
              visitPayload[arrivalField] = value;
              
              createVisitMutation.mutate({
                dealId: member.deal.id,
                visitData: visitPayload,
              });
            }
          }
        });
      }
    }
  };

  const handleExportExcel = () => {
    if (!event || participants.length === 0) return;

    // NOTE: Excel export provides higher granularity than UI table:
    // - UI: 4 columns per city (Прибытие, Транспорт, Отель, Отъезд) for readability
    // - Excel: 8 columns per city (expanding each category into discrete fields)
    //   This provides operations teams with detailed information (flight numbers, room types, etc.)
    const exportData = participants.map((p, index) => {
      // Calculate tourist data completeness for export
      let completenessText = "—";
      if (p.leadTourist) {
        const completeness = calculateTouristDataCompleteness(p.leadTourist);
        const statusSymbol = (status: string) => status === "complete" ? "✓" : status === "partial" ? "◐" : "—";
        completenessText = `${statusSymbol(completeness.personal)} ${statusSymbol(completeness.russianPassport)} ${statusSymbol(completeness.foreignPassport)}`;
      }

      const baseData: Record<string, any> = {
        "№": index + 1,
        "ФИО": formatTouristName(p.leadTourist, p.contact?.name),
        "Данные": completenessText,
        "Статус лида": p.lead ? LEAD_STATUS_LABELS[p.lead.status] || p.lead.status : "—",
        "Email": p.contact?.email || "",
        "Телефон": p.contact?.phone || "",
        "Паспорт": p.contact?.passport || "",
        "Дата рождения": p.contact?.birthDate ? format(new Date(p.contact.birthDate), "dd.MM.yyyy") : "",
        "Сумма": Number(p.lead?.tourCost || 0),
      };

      event.cities.forEach((city) => {
        const visit = p.visits?.find((v) => v.city === city);
        baseData[`${city} - Прибытие`] = visit?.arrivalDate
          ? `${format(new Date(visit.arrivalDate), "dd.MM.yyyy")}${visit.arrivalTime ? ` ${visit.arrivalTime}` : ""}`
          : "";
        baseData[`${city} - Транспорт прибытия`] = visit?.transportType || "";
        baseData[`${city} - Рейс/Поезд прибытия`] = visit?.flightNumber || "";
        baseData[`${city} - Отель`] = visit?.hotelName || "";
        baseData[`${city} - Тип номера`] = visit?.roomType || "";
        baseData[`${city} - Отъезд`] = visit?.departureDate
          ? `${format(new Date(visit.departureDate), "dd.MM.yyyy")}${visit.departureTime ? ` ${visit.departureTime}` : ""}`
          : "";
        baseData[`${city} - Транспорт отъезда`] = visit?.departureTransportType || "";
        baseData[`${city} - Рейс/Поезд отъезда`] = visit?.departureFlightNumber || "";
      });

      return baseData;
    });

    const ws = utils.json_to_sheet(exportData);
    const merges: any[] = [];

    // Track groups and their row ranges for merged cells
    const groupRows = new Map<string, { start: number; end: number; type: string }>();
    participants.forEach((p, index) => {
      const rowIndex = index + 1; // +1 for header row
      if (p.deal.groupId) {
        const existing = groupRows.get(p.deal.groupId);
        if (existing) {
          existing.end = rowIndex;
        } else {
          groupRows.set(p.deal.groupId, {
            start: rowIndex,
            end: rowIndex,
            type: p.group?.type || ''
          });
        }
      }
    });

    // Create merges for lead status column
    groupRows.forEach(({ start, end }) => {
      if (end > start) {
        // Merge "Статус лида" column (column 3 - after №, ФИО, Данные)
        merges.push({
          s: { r: start, c: 3 },
          e: { r: end, c: 3 }
        });
      }
    });

    // Create merges for hotel and transport columns (for groups)
    groupRows.forEach(({ start, end, type }) => {
      if (end > start) {
        const baseColumns = 9; // № + ФИО + Данные + Статус лида + Email + Телефон + Паспорт + ДР + Сумма
        
        event.cities.forEach((city, cityIndex) => {
          const cityBaseCol = baseColumns + (cityIndex * 8); // 8 columns per city
          
          // For families: merge both hotel and transport columns
          if (type === 'family') {
            // Merge transport arrival columns (transportType, flightNumber)
            merges.push({
              s: { r: start, c: cityBaseCol + 1 }, // Транспорт прибытия
              e: { r: end, c: cityBaseCol + 1 }
            });
            merges.push({
              s: { r: start, c: cityBaseCol + 2 }, // Рейс/Поезд прибытия
              e: { r: end, c: cityBaseCol + 2 }
            });
            
            // Merge hotel columns (hotelName, roomType)
            merges.push({
              s: { r: start, c: cityBaseCol + 3 }, // Отель
              e: { r: end, c: cityBaseCol + 3 }
            });
            merges.push({
              s: { r: start, c: cityBaseCol + 4 }, // Тип номера
              e: { r: end, c: cityBaseCol + 4 }
            });
            
            // Merge transport departure columns
            merges.push({
              s: { r: start, c: cityBaseCol + 6 }, // Транспорт отъезда
              e: { r: end, c: cityBaseCol + 6 }
            });
            merges.push({
              s: { r: start, c: cityBaseCol + 7 }, // Рейс/Поезд отъезда
              e: { r: end, c: cityBaseCol + 7 }
            });
          } else if (type === 'mini_group') {
            // For mini-groups: merge only hotel columns
            merges.push({
              s: { r: start, c: cityBaseCol + 3 }, // Отель
              e: { r: end, c: cityBaseCol + 3 }
            });
            merges.push({
              s: { r: start, c: cityBaseCol + 4 }, // Тип номера
              e: { r: end, c: cityBaseCol + 4 }
            });
          }
        });
      }
    });

    ws['!merges'] = merges;
    
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Участники");

    // Sanitize filename by removing special characters and replacing spaces
    const sanitizedEventName = event.name
      .replace(/[^\wа-яА-Я\s-]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const fileName = `${sanitizedEventName}_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
    writeFile(wb, fileName);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getLeadStatusStyle = (status: string): { 
    variant: "default" | "secondary" | "outline" | "destructive"; 
    customClass?: string 
  } => {
    switch (status) {
      case "qualified":
        return { 
          variant: "outline", 
          customClass: "bg-[#f4a825] dark:bg-[#f4a825] text-white dark:text-white !border-[#d89420]" 
        };
      case "converted":
        return { 
          variant: "default", 
          customClass: "bg-green-700 dark:bg-green-800 text-white border-green-800 dark:border-green-900" 
        };
      case "lost":
        return { variant: "destructive" };
      case "new":
      case "contacted":
      default:
        return { variant: "secondary" };
    }
  };

  const getTariffBadge = (clientCategory: string | null | undefined): {
    label: string;
    className: string;
  } | null => {
    switch (clientCategory) {
      case "tariff_standard":
        return {
          label: "Стандарт",
          className: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
        };
      case "tariff_economy":
        return {
          label: "Эконом",
          className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
        };
      case "tariff_vip":
        return {
          label: "VIP",
          className: "bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200",
        };
      default:
        return null;
    }
  };

  if (eventLoading || participantsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-semibold mb-2">Тур не найден</p>
            <Button onClick={() => setLocation("/events")} data-testid="button-back-to-events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к турам
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-event-summary">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/events")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <p className="text-muted-foreground mt-1">
              {event.country}: {event.cities.join(", ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {selectedParticipants.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                Выбрано: {selectedParticipants.size}
              </span>
              <Button
                variant="default"
                onClick={() => {
                  // Get selected participants who are NOT already in a group
                  const selectedDealIds = Array.from(selectedParticipants);
                  const eligibleDeals = selectedDealIds.filter(id => {
                    const p = participants.find(p => p.deal.id === id);
                    return p && !p.deal.groupId;
                  });
                  
                  if (eligibleDeals.length < 2) {
                    toast({
                      title: "Ошибка",
                      description: "Выберите минимум 2 участников без группы для объединения",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Create mini-group with auto-generated name
                  const groupName = `Мини-группа ${new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
                  createMiniGroupMutation.mutate({
                    name: groupName,
                    dealIds: eligibleDeals,
                    primaryDealId: eligibleDeals[0],
                  });
                  setSelectedParticipants(new Set());
                }}
                disabled={createMiniGroupMutation.isPending || selectedParticipants.size < 2}
                data-testid="button-group-selected"
              >
                <UsersRound className="h-4 w-4 mr-2" />
                Сгруппировать
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Get selected participants who ARE in a mini-group
                  const selectedDealIds = Array.from(selectedParticipants);
                  const toUngroup: { groupId: string; dealId: string }[] = [];
                  
                  selectedDealIds.forEach(dealId => {
                    const p = participants.find(p => p.deal.id === dealId);
                    if (p?.deal.groupId && p.group?.type === "mini_group") {
                      toUngroup.push({ groupId: p.deal.groupId, dealId });
                    }
                  });
                  
                  if (toUngroup.length === 0) {
                    toast({
                      title: "Ошибка",
                      description: "Выбранные участники не состоят в мини-группах",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Remove each from their group
                  toUngroup.forEach(({ groupId, dealId }) => {
                    removeFromGroupMutation.mutate({ groupId, dealId });
                  });
                  setSelectedParticipants(new Set());
                }}
                disabled={removeFromGroupMutation.isPending}
                data-testid="button-ungroup-selected"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Разгруппировать
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedParticipants(new Set())}
                data-testid="button-clear-selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={participants.length === 0}
            data-testid="button-export-excel"
          >
            <Download className="h-4 w-4 mr-2" />
            Экспорт в Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="stat-total-participants">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Участников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participants.filter(p => p.lead?.status === "converted").length} / {event.participantLimit}
            </div>
            <p className="text-xs text-muted-foreground">
              {event.availableSpots} мест доступно
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-confirmed">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Подтверждено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participants.filter(p => p.lead?.status === "converted").length}
            </div>
            <p className="text-xs text-muted-foreground">Готовы к туру</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В ожидании</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participants.filter(p => p.lead?.status && p.lead.status !== "converted" && p.lead.status !== "lost").length}
            </div>
            <p className="text-xs text-muted-foreground">Требуют подтверждения</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const processedLeads = new Set<string>();
                const totals: Record<string, number> = {};
                participants
                  .filter(p => p.lead?.status === "converted")
                  .forEach(p => {
                    if (p.lead && !processedLeads.has(p.lead.id)) {
                      processedLeads.add(p.lead.id);
                      if (p.lead.tourCost) {
                        const currency = p.lead.tourCostCurrency || "RUB";
                        const amount = parseFloat(p.lead.tourCost);
                        if (!isNaN(amount)) {
                          totals[currency] = (totals[currency] || 0) + amount;
                        }
                      }
                    }
                  });
                const entries = Object.entries(totals);
                if (entries.length === 0) return "0 ₽";
                return entries.map(([currency, amount]) => 
                  formatCurrency(amount, currency)
                ).join(", ");
              })()}
            </div>
            <p className="text-xs text-muted-foreground">От подтвержденных</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="summary" data-testid="tab-summary">Сводная таблица</TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="finance" data-testid="tab-finance">Финансы</TabsTrigger>
          )}
          {user?.role === "admin" && (
            <TabsTrigger value="expenses" data-testid="tab-expenses">Расходы</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="summary">
          <Card data-testid="card-participants">
            <CardHeader>
              <CardTitle>Сводная таблица по маршруту</CardTitle>
              <CardDescription>
                {event.startDate && format(new Date(event.startDate), "d MMMM yyyy", { locale: ru })} - {event.endDate && format(new Date(event.endDate), "d MMMM yyyy", { locale: ru })}
              </CardDescription>
            </CardHeader>
            <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет участников</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-0">
              {(() => {
                // For mobile: show only ONE card per family (leadId group)
                // Build map of leadId -> representative participant (primary member)
                const familyRepresentatives = new Map<string, Participant>();
                const seenLeadIds = new Set<string>();
                
                // First pass: identify families and their primary representatives
                participants.forEach((p) => {
                  const leadId = p.contact?.leadId;
                  if (leadId) {
                    const leadMembers = participants.filter(m => m.contact?.leadId === leadId);
                    if (leadMembers.length > 1 && !familyRepresentatives.has(leadId)) {
                      // Find primary member or use first member as fallback
                      const primaryMember = leadMembers.find(m => m.leadTourist?.isPrimary) || leadMembers[0];
                      familyRepresentatives.set(leadId, primaryMember);
                    }
                  }
                });
                
                // Second pass: filter participants for display
                const filteredParticipants = participants.filter((participant) => {
                  const leadId = participant.contact?.leadId;
                  
                  // If part of a family (leadId exists)
                  if (leadId && familyRepresentatives.has(leadId)) {
                    // Skip if we've already shown this family
                    if (seenLeadIds.has(leadId)) {
                      return false;
                    }
                    // Only show if this participant is the designated representative
                    const representative = familyRepresentatives.get(leadId);
                    if (participant.deal.id === representative?.deal.id) {
                      seenLeadIds.add(leadId);
                      return true;
                    }
                    return false;
                  }
                  
                  // Show all non-family participants (mini-groups and individuals)
                  return true;
                });
                
                return filteredParticipants.map((participant, displayIndex) => {
                  const leadId = participant.contact?.leadId;
                  const groupId = participant.deal.groupId;
                  const isMiniGroup = participant.group?.type === 'mini_group';
                  
                  let groupInfo: ParticipantCardProps['groupInfo'] = undefined;
                  let sharedFields: ParticipantCardProps['sharedFields'] = undefined;
                  let sharedVisits: CityVisit[] | undefined = undefined;
                  let groupMembers: Participant[] | undefined = undefined;
                  
                  // Priority 1: Lead (family) - shares ALL fields
                  if (leadId) {
                    const leadMembers = participants.filter(p => p.contact?.leadId === leadId);
                    if (leadMembers.length > 1) {
                      groupInfo = {
                        type: 'family',
                        memberCount: leadMembers.length,
                      };
                      sharedFields = {
                        arrival: true,
                        hotel: true,
                        departure: true,
                      };
                      // Use primary member or first member's visits as source for all shared fields
                      const primaryMember = leadMembers.find(m => m.leadTourist?.isPrimary) || leadMembers[0];
                      sharedVisits = primaryMember.visits || [];
                      groupMembers = leadMembers;
                    }
                  }
                  // Priority 2: Mini-group (not in lead, or lead has only 1 member) - shares HOTEL only
                  else if (groupId && isMiniGroup && participant.group) {
                    const miniGroupMembers = participants.filter(p => p.deal.groupId === groupId);
                    if (miniGroupMembers.length > 1) {
                      groupInfo = {
                        type: 'mini_group',
                        name: participant.group.name,
                        memberCount: miniGroupMembers.length,
                      };
                      sharedFields = {
                        arrival: false,
                        hotel: true,
                        departure: false,
                      };
                      // Use first member's visits as source for shared hotel field
                      const primaryMember = miniGroupMembers[0];
                      sharedVisits = primaryMember.visits || [];
                      groupMembers = miniGroupMembers;
                    }
                  }
                  
                  // Check if tourist has birthday during tour
                  const hasBirthday = participant.leadTourist?.dateOfBirth && event
                    ? hasBirthdayDuringTour(participant.leadTourist.dateOfBirth, event.startDate, event.endDate)
                    : false;
                  
                  return (
                    <ParticipantCard
                      key={participant.deal.id}
                      participant={participant}
                      index={displayIndex}
                      cities={event.cities}
                      getGuideName={getGuideName}
                      handleVisitUpdate={handleVisitUpdate}
                      handleEditTourist={handleEditTourist}
                      canEditTourist={canEditTourist}
                      handleRemoveFromGroup={(groupId, dealId) => {
                        removeFromGroupMutation.mutate({ groupId, dealId });
                      }}
                      removeFromGroupPending={removeFromGroupMutation.isPending}
                      lead={participant.lead}
                      getLeadStatusStyle={getLeadStatusStyle}
                      groupInfo={groupInfo}
                      sharedFields={sharedFields}
                      sharedVisits={sharedVisits}
                      groupMembers={groupMembers}
                      hasBirthday={hasBirthday}
                    />
                  );
                });
              })()}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" data-testid="table-participants">
                <thead>
                  <tr className="border-b">
                    <th ref={firstColumnRef} className="sticky left-0 bg-background z-10 text-center p-2 font-medium w-[72px]" rowSpan={2}>
                      <div className="flex items-center justify-center gap-2">
                        <Checkbox
                          checked={selectedParticipants.size > 0 && selectedParticipants.size === participants.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedParticipants(new Set(participants.map(p => p.deal.id)));
                            } else {
                              setSelectedParticipants(new Set());
                            }
                          }}
                          data-testid="checkbox-select-all-participants"
                        />
                        <span>№</span>
                      </div>
                    </th>
                    <th className="sticky bg-background z-10 text-left p-2 font-medium border-r min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]" style={{ left: `${stickyOffset}px` }} rowSpan={2}>ФИО</th>
                    <th className="text-left p-2 font-medium border-r" rowSpan={2}>Данные туриста</th>
                    <th className="text-center p-2 font-medium border-r w-16" rowSpan={2}>Лид</th>
                    <th className="text-center p-2 font-medium border-r w-24" rowSpan={2}>Остаток</th>
                    {event.cities.map((city) => {
                      const guideName = getGuideName(city);
                      return (
                        <th key={city} className="text-center p-2 font-medium border-r bg-muted/30" colSpan={3}>
                          <div className="flex flex-col gap-1">
                            <span>{city}</span>
                            {guideName && (
                              <span className="text-xs text-muted-foreground font-normal">
                                Гид: {guideName}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="border-b text-xs text-muted-foreground">
                    {event.cities.map((city) => (
                      <Fragment key={city}>
                        <th className="text-left p-2 border-r bg-muted/10">Прибытие</th>
                        <th className="text-left p-2 border-r bg-muted/10">Отель</th>
                        <th className="text-left p-2 border-r bg-muted/10">Отъезд</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, index) => {
                    // Determine group membership
                    const groupId = participant.deal.groupId;
                    const groupMembers = participant.group 
                      ? participants.filter(p => p.group?.id === participant.group?.id)
                      : [];
                    const groupSize = groupMembers.length;
                    
                    // Use pre-computed first index map - works even without isPrimaryInGroup flag
                    const isFirstInGroup = groupId ? groupFirstIndexMap.get(groupId) === index : false;
                    
                    // Determine if this is the first row from the same lead (family)
                    const leadId = participant.contact?.leadId;
                    const leadMembers = leadId 
                      ? participants.filter(p => p.contact?.leadId === leadId)
                      : [];
                    const leadSize = leadMembers.length;
                    // Use pre-computed first index map - works even without isPrimary flag
                    const isFirstInLead = leadId ? leadFirstIndexMap.get(leadId) === index : false;
                    
                    // Determine if this is a mini-group (not a family group)
                    const isMiniGroup = participant.group?.type === "mini_group";
                    // Use pre-computed first index map - works even without isPrimaryInGroup flag
                    const isFirstInMiniGroup = isMiniGroup && groupId ? groupFirstIndexMap.get(groupId) === index : false;

                    // Lead column merging: ONLY for families (same leadId), NOT for mini-groups
                    // Mini-groups may have participants from different leads with different statuses
                    const hasLeadFamily = leadId && leadSize > 1;
                    const leadColumnRowSpan = hasLeadFamily ? leadSize : 1;
                    const isLeadColumnAnchor = hasLeadFamily ? isFirstInLead : true;

                    // Check if tourist has birthday during tour
                    const hasBirthday = participant.leadTourist?.dateOfBirth && event
                      ? hasBirthdayDuringTour(participant.leadTourist.dateOfBirth, event.startDate, event.endDate)
                      : false;

                    return (
                      <tr
                        key={participant.deal.id}
                        className={`border-b hover-elevate ${participant.group ? 'bg-muted/5' : ''} ${hasBirthday ? 'bg-pink-50 dark:bg-pink-950/20' : ''}`}
                        data-testid={`row-participant-${participant.deal.id}`}
                      >
                        {/* Number column with checkbox - always present */}
                        <td className="sticky left-0 bg-background z-10 p-2 text-center w-[72px]">
                          <div className="flex items-center justify-center gap-2">
                            <Checkbox
                              checked={selectedParticipants.has(participant.deal.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedParticipants);
                                if (checked) {
                                  newSet.add(participant.deal.id);
                                } else {
                                  newSet.delete(participant.deal.id);
                                }
                                setSelectedParticipants(newSet);
                              }}
                              data-testid={`checkbox-participant-${participant.deal.id}`}
                            />
                            <span>{index + 1}</span>
                          </div>
                        </td>
                        
                        {/* Name column - sticky */}
                        <td className="sticky bg-background z-10 p-2 font-medium border-r min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]" style={{ left: `${stickyOffset}px` }} data-testid={`text-name-${participant.deal.id}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span>{formatTouristName(participant.leadTourist, participant.contact?.name)}</span>
                              {participant.leadTourist && (
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger 
                                      type="button" 
                                      className="inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1.5 text-[10px] font-semibold transition-colors cursor-default hover-elevate"
                                      data-testid={`badge-tourist-type-${participant.deal.id}`}
                                    >
                                      {participant.leadTourist.touristType === "adult" ? (
                                        <UserIcon className="h-3 w-3 text-muted-foreground" />
                                      ) : participant.leadTourist.touristType === "child" ? (
                                        <UserIcon className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                                      ) : (
                                        <Baby className="h-3 w-3 text-pink-500 dark:text-pink-400" />
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{participant.leadTourist.touristType === "adult" ? "Взрослый" : participant.leadTourist.touristType === "child" ? "Ребенок" : "Младенец"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {participant.leadTourist.isPrimary && (
                                    <Tooltip>
                                      <TooltipTrigger 
                                        type="button"
                                        className="inline-flex items-center rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground transition-colors cursor-default hover-elevate"
                                        data-testid={`badge-primary-tourist-${participant.deal.id}`}
                                      >
                                        <Star className="h-3 w-3" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Основной турист</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {hasBirthday && (
                                    <Tooltip>
                                      <TooltipTrigger 
                                        type="button"
                                        className="inline-flex items-center rounded-md bg-pink-100 dark:bg-pink-900 px-2.5 py-1.5 text-[10px] font-semibold text-pink-700 dark:text-pink-200 transition-colors cursor-default hover-elevate"
                                        data-testid={`badge-birthday-${participant.deal.id}`}
                                      >
                                        <Cake className="h-3 w-3" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>День рождения в период тура</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {canEditTourist(participant) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-50 hover:opacity-100"
                                  onClick={() => handleEditTourist(participant.contact?.id, participant)}
                                  data-testid={`button-edit-tourist-${participant.deal.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              {participant.deal.groupId && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-50 hover:opacity-100"
                                  onClick={() => {
                                    const displayName = formatTouristName(participant.leadTourist, participant.contact?.name);
                                    if (confirm(`Удалить ${displayName} из группы?`)) {
                                      removeFromGroupMutation.mutate({
                                        groupId: participant.deal.groupId!,
                                        dealId: participant.deal.id,
                                      });
                                    }
                                  }}
                                  disabled={removeFromGroupMutation.isPending}
                                  data-testid={`button-remove-from-group-${participant.deal.id}`}
                                >
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r">
                          {participant.leadTourist ? (
                            <DataCompletenessIndicator 
                              completeness={calculateTouristDataCompleteness(participant.leadTourist)} 
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        
                        {/* Lead status column with rowSpan - merges for both families AND mini-groups */}
                        {isLeadColumnAnchor && (
                          <td 
                            className="p-2 border-r text-center align-top w-16"
                            rowSpan={leadColumnRowSpan}
                          >
                            {participant.lead ? (() => {
                              const style = getLeadStatusStyle(participant.lead.status);
                              // Only show limited route if selectedCities is explicitly set and has fewer cities than the event
                              const hasLimitedRoute = participant.lead.selectedCities && 
                                participant.lead.selectedCities.length > 0 &&
                                participant.lead.selectedCities.length < event.cities.length;
                              return (
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingLeadId(participant.lead!.id)}
                                    data-testid={`button-lead-${participant.lead.id}`}
                                  >
                                    <Badge 
                                      variant={style.variant}
                                      className={`text-[10px] cursor-pointer hover-elevate ${style.customClass || ''}`}
                                    >
                                      {LEAD_STATUS_LABELS[participant.lead.status] || participant.lead.status}
                                    </Badge>
                                  </button>
                                  {hasLimitedRoute && (
                                    <Tooltip>
                                      <TooltipTrigger 
                                        type="button"
                                        className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-200 cursor-default"
                                        data-testid={`badge-limited-route-${participant.lead.id}`}
                                      >
                                        <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                        {participant.lead.selectedCities?.length}/{event.cities.length}
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium mb-1">Ограниченный маршрут</p>
                                        <p className="text-xs">Города: {participant.lead.selectedCities?.join(", ")}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {(() => {
                                    const tariff = getTariffBadge(participant.lead.clientCategory);
                                    if (!tariff) return null;
                                    return (
                                      <span 
                                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium ${tariff.className}`}
                                        data-testid={`badge-tariff-${participant.lead.id}`}
                                      >
                                        {tariff.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                              );
                            })() : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        
                        {/* Remaining payment column */}
                        {isLeadColumnAnchor && (
                          <td 
                            className="p-2 border-r text-center align-top w-24"
                            rowSpan={leadColumnRowSpan}
                          >
                            {participant.lead?.remainingPayment ? (
                              <span className="text-sm font-medium">
                                {formatCurrency(participant.lead.remainingPayment, participant.lead.remainingPaymentCurrency || "RUB")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        
                        {event.cities.map((city) => {
                          const visit = participant.visits?.find((v) => v.city === city);
                          const cityMeta = buildCityColumnsMeta(participant, leadId, leadSize, isFirstInLead, isMiniGroup, isFirstInMiniGroup, groupSize);
                          
                          return (
                            <Fragment key={city}>
                              {cityMeta.showArrival && (
                                <td 
                                  className="p-1 border-r align-top" 
                                  {...(cityMeta.arrivalRowSpan > 1 && { rowSpan: cityMeta.arrivalRowSpan })}
                                >
                                  <div className="space-y-1">
                                    <div className="flex gap-1">
                                      <EditableCell
                                        type="date"
                                        value={visit?.arrivalDate}
                                        placeholder="Дата"
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "arrivalDate", value)}
                                        className="text-xs flex-1"
                                      />
                                      <EditableCell
                                        type="time"
                                        value={visit?.arrivalTime}
                                        placeholder="Время"
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "arrivalTime", value)}
                                        className="text-xs flex-1"
                                      />
                                    </div>
                                    <div className="flex gap-1">
                                      <TransportTypeSelector
                                        value={visit?.transportType}
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "transportType", value)}
                                        testIdSuffix={`-${participant.deal.id}-${city}-arrival`}
                                      />
                                      <EditableCell
                                        type="text"
                                        value={visit?.flightNumber}
                                        placeholder="№ рейса"
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "flightNumber", value)}
                                        className="text-xs flex-1"
                                      />
                                    </div>
                                    <div className="flex gap-1">
                                      <EditableCell
                                        type="text"
                                        value={visit?.airport}
                                        placeholder={visit?.transportType === "plane" ? "Аэропорт" : visit?.transportType === "bus" ? "Автостанция" : "Вокзал"}
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "airport", value)}
                                        className="text-xs flex-1"
                                      />
                                      <EditableCell
                                        type="text"
                                        value={visit?.transfer}
                                        placeholder="Трансфер"
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "transfer", value)}
                                        className="text-xs flex-1"
                                      />
                                    </div>
                                  </div>
                                </td>
                              )}
                              {cityMeta.showHotel && (
                                <td 
                                  className="p-1 border-r min-w-[120px] align-top" 
                                  {...(cityMeta.hotelRowSpan > 1 && { rowSpan: cityMeta.hotelRowSpan })}
                                >
                                  <div className="space-y-1">
                                    <EditableCell
                                      type="text"
                                      value={visit?.hotelName}
                                      placeholder="Отель"
                                      onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "hotelName", value)}
                                      className="text-xs"
                                      triggerTestId={`editable-hotelName-${city}-${participant.deal.id}`}
                                      inputTestId={`input-hotelName-${city}-${participant.deal.id}`}
                                    />
                                    <EditableCell
                                      type="select"
                                      value={visit?.roomType}
                                      placeholder="Тип номера"
                                      selectOptions={[
                                        { value: "single", label: "Single" },
                                        { value: "twin", label: "Twin" },
                                        { value: "double", label: "Double" },
                                      ]}
                                      onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "roomType", value)}
                                      className="text-xs"
                                      triggerTestId={`editable-roomType-${city}-${participant.deal.id}`}
                                    />
                                  </div>
                                </td>
                              )}
                              {cityMeta.showDeparture && (
                                <td 
                                  className="p-1 border-r align-top" 
                                  {...(cityMeta.departureRowSpan > 1 && { rowSpan: cityMeta.departureRowSpan })}
                                >
                                  <div className="space-y-1">
                                    <div className="flex gap-1">
                                      <EditableCell
                                        type="date"
                                        value={visit?.departureDate}
                                        placeholder="Дата"
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "departureDate", value)}
                                        className="text-xs flex-1"
                                      />
                                      <EditableCell
                                        type="time"
                                        value={visit?.departureTime}
                                        placeholder="Время"
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "departureTime", value)}
                                        className="text-xs flex-1"
                                      />
                                    </div>
                                    <div className="flex gap-1">
                                      <TransportTypeSelector
                                        value={visit?.departureTransportType}
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "departureTransportType", value)}
                                        testIdSuffix={`-${participant.deal.id}-${city}-departure`}
                                      />
                                      <EditableCell
                                        type="text"
                                        value={visit?.departureFlightNumber}
                                        placeholder="№ рейса"
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "departureFlightNumber", value)}
                                        className="text-xs flex-1"
                                      />
                                    </div>
                                    <div className="flex gap-1">
                                      <EditableCell
                                        type="text"
                                        value={visit?.departureAirport}
                                        placeholder={visit?.departureTransportType === "plane" ? "Аэропорт" : visit?.departureTransportType === "bus" ? "Автостанция" : "Вокзал"}
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "departureAirport", value)}
                                        className="text-xs flex-1"
                                      />
                                      <EditableCell
                                        type="text"
                                        value={visit?.departureTransfer}
                                        placeholder="Трансфер"
                                        onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "departureTransfer", value)}
                                        className="text-xs flex-1"
                                      />
                                    </div>
                                  </div>
                                </td>
                              )}
                            </Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Summary row */}
                <tfoot className="border-t-2 bg-muted/30">
                  <tr className="font-medium">
                    <td colSpan={2} className="sticky left-0 bg-muted/30 z-10 p-2 text-right">Итого:</td>
                    <td className="p-2 border-r text-center">
                      {participants.length} чел.
                    </td>
                    <td className="p-2 border-r text-center">—</td>
                    <td className="p-2 border-r text-center">
                      {(() => {
                        // Calculate total remaining payment grouped by currency
                        const processedLeads = new Set<string>();
                        const totals: Record<string, number> = {};
                        
                        participants.forEach(p => {
                          if (p.lead && !processedLeads.has(p.lead.id)) {
                            processedLeads.add(p.lead.id);
                            if (p.lead.remainingPayment) {
                              const currency = p.lead.remainingPaymentCurrency || "RUB";
                              const amount = parseFloat(p.lead.remainingPayment);
                              if (!isNaN(amount)) {
                                totals[currency] = (totals[currency] || 0) + amount;
                              }
                            }
                          }
                        });
                        
                        const entries = Object.entries(totals);
                        if (entries.length === 0) return "—";
                        
                        return entries.map(([currency, amount]) => 
                          formatCurrency(amount, currency)
                        ).join(", ");
                      })()}
                    </td>
                    {event.cities.map((city) => (
                      <Fragment key={city}>
                        <td className="p-2 border-r text-center">—</td>
                        <td className="p-2 border-r text-center text-xs">
                          {(() => {
                            // Count room types for this city
                            const roomTypeCounts: Record<string, number> = {};
                            
                            participants.forEach(p => {
                              const visit = p.visits?.find(v => v.city === city);
                              if (visit?.roomType) {
                                const type = visit.roomType;
                                roomTypeCounts[type] = (roomTypeCounts[type] || 0) + 1;
                              }
                            });
                            
                            const entries = Object.entries(roomTypeCounts);
                            if (entries.length === 0) return "—";
                            
                            return entries
                              .sort((a, b) => b[1] - a[1])
                              .map(([type, count]) => `${count} ${type}`)
                              .join(", ");
                          })()}
                        </td>
                        <td className="p-2 border-r text-center">—</td>
                      </Fragment>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {user?.role === "admin" && (
        <TabsContent value="finance">
          <Card data-testid="card-finance">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Финансы по маршруту</CardTitle>
                <CardDescription>
                  {event.startDate && format(new Date(event.startDate), "d MMMM yyyy", { locale: ru })} - {event.endDate && format(new Date(event.endDate), "d MMMM yyyy", { locale: ru })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Валюта расходов:</span>
                <Select value={expenseCurrency} onValueChange={(v) => setExpenseCurrency(v as "CNY" | "EUR")}>
                  <SelectTrigger className="w-24" data-testid="select-expense-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">¥ CNY</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет участников</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm border-collapse min-w-max">
                    <thead className="sticky top-0 z-20 bg-background">
                      <tr className="border-b bg-muted/50">
                        <th className="sticky left-0 bg-muted/50 z-30 p-2 text-left font-medium border-r min-w-[56px]">№</th>
                        <th 
                          ref={firstColumnRef}
                          className="sticky bg-muted/50 z-30 p-2 text-left font-medium border-r min-w-[200px]"
                          style={{ left: stickyOffset }}
                        >
                          Участник
                        </th>
                        <th className="p-2 text-center font-medium border-r min-w-[120px]">Стоимость тура</th>
                        <th className="p-2 text-center font-medium border-r min-w-[100px]">Оплачено</th>
                        <th className="p-2 text-center font-medium border-r min-w-[100px]">Остаток</th>
                        <th className="p-2 text-center font-medium border-r min-w-[120px] bg-orange-50 dark:bg-orange-950/30">Сумма расходов</th>
                        {event.cities.map((city) => (
                          <Fragment key={city}>
                            <th colSpan={2} className="p-2 text-center font-medium border-r bg-muted/30">
                              <div className="flex items-center justify-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {city}
                              </div>
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="sticky left-0 bg-background z-30 p-1 border-r"></th>
                        <th 
                          className="sticky bg-background z-30 p-1 border-r"
                          style={{ left: stickyOffset }}
                        ></th>
                        <th className="p-1 border-r"></th>
                        <th className="p-1 border-r"></th>
                        <th className="p-1 border-r"></th>
                        <th className="p-1 border-r bg-orange-50 dark:bg-orange-950/30"></th>
                        {event.cities.map((city) => (
                          <Fragment key={city}>
                            <th colSpan={2} className="p-1 border-r text-center min-w-[270px]">Расходы</th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Group participants by leadId for family consolidation
                        const groupedByLead = new Map<string, Participant[]>();
                        const individualParticipants: Participant[] = [];
                        
                        participants.forEach(p => {
                          const leadId = p.contact?.leadId;
                          if (leadId) {
                            if (!groupedByLead.has(leadId)) {
                              groupedByLead.set(leadId, []);
                            }
                            groupedByLead.get(leadId)!.push(p);
                          } else {
                            individualParticipants.push(p);
                          }
                        });
                        
                        // Create consolidated rows: one per lead (family) + individuals
                        const consolidatedRows: { leadId: string; members: Participant[]; primary: Participant }[] = [];
                        
                        groupedByLead.forEach((members, leadId) => {
                          const primary = members.find(m => m.leadTourist?.isPrimary) || members[0];
                          consolidatedRows.push({ leadId, members, primary });
                        });
                        
                        // Add individuals as single-member "groups"
                        individualParticipants.forEach(p => {
                          consolidatedRows.push({ leadId: p.deal.id, members: [p], primary: p });
                        });
                        
                        return consolidatedRows.map((group, index) => {
                          const { members, primary } = group;
                          const isFamily = members.length > 1;
                          
                          // Get all deal IDs for expense aggregation
                          const allDealIds = members.map(m => m.deal.id);
                          
                          return (
                            <tr 
                              key={group.leadId}
                              className="border-b hover:bg-muted/30"
                              data-testid={`finance-row-${group.leadId}`}
                            >
                              <td className="sticky left-0 bg-background z-10 p-2 border-r text-center font-medium">
                                {index + 1}
                              </td>
                              <td 
                                className="sticky bg-background z-10 p-2 border-r"
                                style={{ left: stickyOffset }}
                              >
                                <div className="flex items-start gap-2">
                                  {isFamily && <UsersRound className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />}
                                  <div className="flex flex-col gap-0.5">
                                    {members.map((member, idx) => (
                                      <span 
                                        key={member.deal.id} 
                                        className={`truncate max-w-[180px] ${idx === 0 ? 'font-medium' : 'text-sm text-muted-foreground'}`}
                                      >
                                        {formatTouristName(member.leadTourist, member.contact?.name)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 border-r text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <EditableCell
                                    type="text"
                                    value={primary.lead?.tourCost || ""}
                                    placeholder="0"
                                    onSave={(value) => {
                                      if (primary.lead?.id) {
                                        updateLeadMutation.mutate({
                                          leadId: primary.lead.id,
                                          tourCost: value || undefined,
                                        });
                                      }
                                    }}
                                    className="text-sm text-center"
                                  />
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {getCurrencySymbol(primary.lead?.tourCostCurrency || "RUB")}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 border-r text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <EditableCell
                                    type="text"
                                    value={primary.lead?.advancePayment || ""}
                                    placeholder="0"
                                    onSave={(value) => {
                                      if (primary.lead?.id) {
                                        updateLeadMutation.mutate({
                                          leadId: primary.lead.id,
                                          advancePayment: value || undefined,
                                        });
                                      }
                                    }}
                                    className="text-sm text-center"
                                  />
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {getCurrencySymbol(primary.lead?.advancePaymentCurrency || "RUB")}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 border-r text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <EditableCell
                                    type="text"
                                    value={primary.lead?.remainingPayment || ""}
                                    placeholder="0"
                                    onSave={(value) => {
                                      if (primary.lead?.id) {
                                        updateLeadMutation.mutate({
                                          leadId: primary.lead.id,
                                          remainingPayment: value || undefined,
                                        });
                                      }
                                    }}
                                    className="text-sm text-center"
                                  />
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {getCurrencySymbol(primary.lead?.remainingPaymentCurrency || "RUB")}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 border-r text-center font-medium bg-orange-50 dark:bg-orange-950/30">
                                {(() => {
                                  // Sum expenses from all family members
                                  const total = participantExpenses
                                    .filter(e => allDealIds.includes(e.dealId))
                                    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
                                  return total > 0 ? formatCurrency(total) : "—";
                                })()}
                              </td>
                              {event.cities.map((city) => {
                                // Combine expenses from all family members for this city
                                const allCityExpenses = allDealIds.flatMap(dealId => 
                                  getParticipantExpenses(dealId, city)
                                );
                                
                                // Group expenses by type to avoid duplicates, sum amounts
                                const expensesByType = new Map<string, { amount: number; comment: string; currency: string; dealId: string; expenseId: string }>();
                                allCityExpenses.forEach(expense => {
                                  const existing = expensesByType.get(expense.expenseType);
                                  if (existing) {
                                    existing.amount += Number(expense.amount || 0);
                                    if (expense.comment && !existing.comment.includes(expense.comment)) {
                                      existing.comment = existing.comment ? `${existing.comment}; ${expense.comment}` : expense.comment;
                                    }
                                  } else {
                                    expensesByType.set(expense.expenseType, {
                                      amount: Number(expense.amount || 0),
                                      comment: expense.comment || "",
                                      currency: expense.currency || "RUB",
                                      dealId: expense.dealId,
                                      expenseId: expense.id
                                    });
                                  }
                                });
                                
                                const consolidatedExpenses = Array.from(expensesByType.entries()).map(([type, data]) => ({
                                  expenseType: type,
                                  ...data
                                }));
                                
                                const usedTypes = consolidatedExpenses.map(e => e.expenseType);
                                const availableTypes = Object.keys(EXPENSE_TYPE_LABELS).filter(t => !usedTypes.includes(t));
                                
                                // Use primary member's deal for adding new expenses
                                const primaryDealId = primary.deal.id;
                                
                                return (
                                  <Fragment key={city}>
                                    <td className="p-1 border-r align-top" colSpan={2}>
                                      <div className="space-y-1">
                                        {consolidatedExpenses.map((expense, idx) => {
                                          const isCustomExpense = expense.expenseType.startsWith("custom:");
                                          const displayName = isCustomExpense 
                                            ? expense.expenseType.replace("custom:", "") 
                                            : (EXPENSE_TYPE_LABELS[expense.expenseType] || expense.expenseType);
                                          
                                          return (
                                          <div key={`${expense.expenseType}-${idx}`} className="flex items-center gap-1 bg-muted/30 rounded p-1">
                                            {isCustomExpense ? (
                                              <div className="flex items-center gap-0.5 flex-1 min-w-[6rem]">
                                                <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                                <Input
                                                  type="text"
                                                  placeholder=""
                                                  defaultValue={/^Расход \d{10,}$/.test(displayName) ? "" : displayName}
                                                  className="h-6 text-xs flex-1 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0.5 text-muted-foreground font-inherit"
                                                  data-testid={`input-expense-name-${group.leadId}-${city}-${idx}`}
                                                  onFocus={() => recentlyCreatedExpenses.current.delete(expense.expenseType)}
                                                  onBlur={(e) => {
                                                    if (recentlyCreatedExpenses.current.has(expense.expenseType)) return;
                                                    if (upsertParticipantExpenseMutation.isPending || deleteParticipantExpenseMutation.isPending) return;
                                                    const newName = e.target.value.trim();
                                                    const oldKey = expense.expenseType;
                                                    const oldDisplayName = oldKey.replace("custom:", "");
                                                    if (newName && newName !== oldDisplayName) {
                                                      const newKey = `custom:${newName}`;
                                                      deleteParticipantExpenseMutation.mutate({
                                                        dealId: expense.dealId,
                                                        city,
                                                        expenseType: oldKey,
                                                        silent: true,
                                                      }, {
                                                        onSuccess: () => {
                                                          upsertParticipantExpenseMutation.mutate({
                                                            dealId: expense.dealId,
                                                            city,
                                                            expenseType: newKey,
                                                            amount: String(expense.amount ?? 0),
                                                            currency: expense.currency || "RUB",
                                                            comment: expense.comment || undefined,
                                                          });
                                                        }
                                                      });
                                                    }
                                                  }}
                                                />
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground flex-1 min-w-[6rem] truncate" title={displayName}>
                                                {displayName}
                                              </span>
                                            )}
                                            <Input
                                              key={`${expense.expenseType}-${expense.amount}`}
                                              type="text"
                                              placeholder="0"
                                              defaultValue={expense.amount > 0 ? String(expense.amount) : ""}
                                              className="h-6 text-xs text-center w-20"
                                              data-testid={`input-expense-amount-${group.leadId}-${city}-${idx}`}
                                              onFocus={() => recentlyCreatedExpenses.current.delete(expense.expenseType)}
                                              onBlur={(e) => {
                                                if (recentlyCreatedExpenses.current.has(expense.expenseType)) return;
                                                if (upsertParticipantExpenseMutation.isPending) return;
                                                const value = e.target.value;
                                                upsertParticipantExpenseMutation.mutate({
                                                  dealId: expense.dealId,
                                                  city,
                                                  expenseType: expense.expenseType,
                                                  amount: value || undefined,
                                                  currency: expense.currency || "RUB",
                                                  comment: expense.comment || undefined,
                                                });
                                              }}
                                            />
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 shrink-0"
                                                  data-testid={`button-comment-${group.leadId}-${city}-${idx}`}
                                                >
                                                  <MessageSquare className={`h-3 w-3 ${expense.comment ? 'text-primary' : ''}`} />
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-64 p-2" align="end">
                                                <Textarea
                                                  placeholder="Добавить комментарий..."
                                                  defaultValue={expense.comment || ""}
                                                  className="text-xs min-h-[80px]"
                                                  data-testid={`textarea-comment-${group.leadId}-${city}-${idx}`}
                                                  onBlur={(e) => {
                                                    const value = e.target.value;
                                                    upsertParticipantExpenseMutation.mutate({
                                                      dealId: expense.dealId,
                                                      city,
                                                      expenseType: expense.expenseType,
                                                      amount: expense.amount > 0 ? String(expense.amount) : undefined,
                                                      currency: expense.currency || "RUB",
                                                      comment: value || undefined,
                                                    });
                                                  }}
                                                />
                                              </PopoverContent>
                                            </Popover>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
                                              onClick={() => {
                                                if (confirm("Удалить этот расход?")) {
                                                  deleteParticipantExpenseMutation.mutate({
                                                    dealId: expense.dealId,
                                                    city,
                                                    expenseType: expense.expenseType,
                                                  });
                                                }
                                              }}
                                              data-testid={`button-delete-expense-${group.leadId}-${city}-${idx}`}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          );
                                        })}
                                        <div className="flex gap-1 flex-wrap">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs flex-1"
                                            onClick={() => {
                                              const uniqueId = Date.now();
                                              const newExpenseType = `custom:Расход ${uniqueId}`;
                                              recentlyCreatedExpenses.current.add(newExpenseType);
                                              upsertParticipantExpenseMutation.mutate({
                                                dealId: primaryDealId,
                                                city,
                                                expenseType: newExpenseType,
                                                amount: "0",
                                                currency: "RUB",
                                              });
                                            }}
                                            data-testid={`button-add-expense-${group.leadId}-${city}`}
                                          >
                                            <Plus className="h-3 w-3 mr-1" /> Добавить
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs flex-1"
                                            onClick={() => {
                                              setSelectedCityForExpense(city);
                                              setSelectedDealForExpense(primaryDealId);
                                              setShowAddExpenseFromCatalog(true);
                                            }}
                                            data-testid={`button-add-catalog-expense-participant-${group.leadId}-${city}`}
                                          >
                                            <Plus className="h-3 w-3 mr-1" /> Из каталога
                                          </Button>
                                        </div>
                                      </div>
                                    </td>
                                  </Fragment>
                                );
                              })}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                    <tfoot className="border-t-2">
                      <tr className="bg-blue-50 dark:bg-blue-950/30">
                        <td colSpan={2} className="sticky left-0 bg-blue-50 dark:bg-blue-950/30 z-10 p-2 text-right font-medium">
                          Общие расходы:
                        </td>
                        <td colSpan={3} className="p-2 border-r"></td>
                        <td className="p-2 border-r text-center font-bold bg-orange-100 dark:bg-orange-900/30">
                          {(() => {
                            const total = commonExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                            return total > 0 ? formatCurrency(total) : "—";
                          })()}
                        </td>
                        {event.cities.map((city) => {
                          const cityCommonExpenses = getCommonExpensesForCity(city);
                          const usedTypes = cityCommonExpenses.map(e => e.expenseType);
                          const availableTypes = Object.keys(COMMON_EXPENSE_TYPE_LABELS).filter(t => !usedTypes.includes(t));
                          
                          return (
                            <Fragment key={city}>
                              <td className="p-1 border-r align-top" colSpan={2}>
                                <div className="space-y-1">
                                  {cityCommonExpenses.map((expense, idx) => {
                                    const isCustomExpense = expense.expenseType.startsWith("custom:");
                                    const displayName = isCustomExpense 
                                      ? expense.expenseType.replace("custom:", "") 
                                      : (COMMON_EXPENSE_TYPE_LABELS[expense.expenseType] || expense.expenseType);
                                    
                                    return (
                                    <div key={expense.id} className="flex items-center gap-1 bg-white dark:bg-background rounded p-1">
                                      {isCustomExpense ? (
                                        <div className="flex items-center gap-0.5 flex-1 min-w-[6rem]">
                                          <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                          <Input
                                            type="text"
                                            placeholder=""
                                            defaultValue={/^Расход \d{10,}$/.test(displayName) ? "" : displayName}
                                            className="h-6 text-xs flex-1 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0.5 text-muted-foreground font-inherit"
                                            data-testid={`input-common-expense-name-${city}-${idx}`}
                                            onFocus={() => recentlyCreatedExpenses.current.delete(expense.expenseType)}
                                            onBlur={(e) => {
                                              if (recentlyCreatedExpenses.current.has(expense.expenseType)) return;
                                              if (upsertCommonExpenseMutation.isPending || deleteCommonExpenseMutation.isPending) return;
                                              const newName = e.target.value.trim();
                                              const oldKey = expense.expenseType;
                                              const oldDisplayName = oldKey.replace("custom:", "");
                                              if (newName && newName !== oldDisplayName) {
                                                const newKey = `custom:${newName}`;
                                                deleteCommonExpenseMutation.mutate({
                                                  city,
                                                  expenseType: oldKey,
                                                  silent: true,
                                                }, {
                                                  onSuccess: () => {
                                                    upsertCommonExpenseMutation.mutate({
                                                      city,
                                                      expenseType: newKey,
                                                      amount: String(expense.amount ?? 0),
                                                      currency: expense.currency || "RUB",
                                                      comment: expense.comment ?? undefined,
                                                    });
                                                  }
                                                });
                                              }
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground flex-1 min-w-[6rem] truncate" title={displayName}>
                                          {displayName}
                                        </span>
                                      )}
                                      <Input
                                        key={`${expense.expenseType}-${expense.amount}`}
                                        type="text"
                                        placeholder="0"
                                        defaultValue={expense.amount || ""}
                                        className="h-6 text-xs text-center w-20"
                                        data-testid={`input-common-expense-amount-${city}-${idx}`}
                                        onFocus={() => recentlyCreatedExpenses.current.delete(expense.expenseType)}
                                        onBlur={(e) => {
                                          if (recentlyCreatedExpenses.current.has(expense.expenseType)) return;
                                          if (upsertCommonExpenseMutation.isPending) return;
                                          const value = e.target.value;
                                          upsertCommonExpenseMutation.mutate({
                                            city,
                                            expenseType: expense.expenseType,
                                            amount: value || undefined,
                                            currency: expense.currency || "RUB",
                                            comment: expense.comment ?? undefined,
                                          });
                                        }}
                                      />
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 shrink-0"
                                            data-testid={`button-comment-common-${city}-${idx}`}
                                          >
                                            <MessageSquare className={`h-3 w-3 ${expense.comment ? 'text-primary' : ''}`} />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-2" align="end">
                                          <Textarea
                                            placeholder="Добавить комментарий..."
                                            defaultValue={expense.comment || ""}
                                            className="text-xs min-h-[80px]"
                                            data-testid={`textarea-comment-common-${city}-${idx}`}
                                            onBlur={(e) => {
                                              const value = e.target.value;
                                              upsertCommonExpenseMutation.mutate({
                                                city,
                                                expenseType: expense.expenseType,
                                                amount: expense.amount || undefined,
                                                currency: expense.currency || "RUB",
                                                comment: value || undefined,
                                              });
                                            }}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
                                        onClick={() => {
                                          if (confirm("Удалить этот расход?")) {
                                            deleteCommonExpenseMutation.mutate({
                                              city,
                                              expenseType: expense.expenseType,
                                            });
                                          }
                                        }}
                                        data-testid={`button-delete-common-expense-${city}-${idx}`}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    );
                                  })}
                                  <div className="flex gap-1 flex-wrap">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs flex-1 bg-white dark:bg-background"
                                      onClick={() => {
                                        const uniqueId = Date.now();
                                        const newExpenseType = `custom:Расход ${uniqueId}`;
                                        recentlyCreatedExpenses.current.add(newExpenseType);
                                        upsertCommonExpenseMutation.mutate({
                                          city,
                                          expenseType: newExpenseType,
                                          amount: "0",
                                          currency: "RUB",
                                        });
                                      }}
                                      data-testid={`button-add-common-expense-${city}`}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Добавить
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-xs flex-1"
                                      onClick={() => {
                                        setSelectedCityForExpense(city);
                                        setSelectedDealForExpense(null);
                                        setShowAddExpenseFromCatalog(true);
                                      }}
                                      data-testid={`button-add-catalog-expense-${city}`}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Из каталога
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                      <tr className="font-bold bg-muted/50">
                        <td colSpan={2} className="sticky left-0 bg-muted/50 z-10 p-2 text-right">ИТОГО:</td>
                        <td className="p-2 border-r text-center">
                          {(() => {
                            const processedLeads = new Set<string>();
                            const totals: Record<string, number> = {};
                            
                            participants.forEach(p => {
                              if (p.lead && !processedLeads.has(p.lead.id)) {
                                processedLeads.add(p.lead.id);
                                if (p.lead.tourCost) {
                                  const currency = p.lead.tourCostCurrency || "RUB";
                                  const amount = parseFloat(p.lead.tourCost);
                                  if (!isNaN(amount)) {
                                    totals[currency] = (totals[currency] || 0) + amount;
                                  }
                                }
                              }
                            });
                            
                            const entries = Object.entries(totals);
                            if (entries.length === 0) return "—";
                            
                            // Calculate converted total
                            let convertedTotal = 0;
                            entries.forEach(([currency, amount]) => {
                              convertedTotal += convertToCurrency(amount, currency, expenseCurrency);
                            });
                            
                            const originalDisplay = entries.map(([currency, amount]) => 
                              formatCurrency(amount, currency)
                            ).join(", ");
                            
                            const currencySymbol = expenseCurrency === "CNY" ? "¥" : "€";
                            
                            return (
                              <div>
                                <div>{originalDisplay}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  ≈ {formatCurrency(convertedTotal, expenseCurrency)} {currencySymbol}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-2 border-r text-center">
                          {(() => {
                            const processedLeads = new Set<string>();
                            const totals: Record<string, number> = {};
                            
                            participants.forEach(p => {
                              if (p.lead && !processedLeads.has(p.lead.id)) {
                                processedLeads.add(p.lead.id);
                                if (p.lead.advancePayment) {
                                  const currency = p.lead.advancePaymentCurrency || "RUB";
                                  const amount = parseFloat(p.lead.advancePayment);
                                  if (!isNaN(amount)) {
                                    totals[currency] = (totals[currency] || 0) + amount;
                                  }
                                }
                              }
                            });
                            
                            const entries = Object.entries(totals);
                            if (entries.length === 0) return "—";
                            
                            return entries.map(([currency, amount]) => 
                              formatCurrency(amount, currency)
                            ).join(", ");
                          })()}
                        </td>
                        <td className="p-2 border-r text-center">
                          {(() => {
                            const processedLeads = new Set<string>();
                            const totals: Record<string, number> = {};
                            
                            participants.forEach(p => {
                              if (p.lead && !processedLeads.has(p.lead.id)) {
                                processedLeads.add(p.lead.id);
                                if (p.lead.remainingPayment) {
                                  const currency = p.lead.remainingPaymentCurrency || "RUB";
                                  const amount = parseFloat(p.lead.remainingPayment);
                                  if (!isNaN(amount)) {
                                    totals[currency] = (totals[currency] || 0) + amount;
                                  }
                                }
                              }
                            });
                            
                            const entries = Object.entries(totals);
                            if (entries.length === 0) return "—";
                            
                            return entries.map(([currency, amount]) => 
                              formatCurrency(amount, currency)
                            ).join(", ");
                          })()}
                        </td>
                        <td className="p-2 border-r text-center font-bold bg-orange-100 dark:bg-orange-900/30">
                          {(() => {
                            const participantTotal = participantExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                            const commonTotal = commonExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                            const grandTotal = participantTotal + commonTotal;
                            return grandTotal > 0 ? formatCurrency(grandTotal) : "—";
                          })()}
                        </td>
                        {event.cities.map((city) => {
                          const cityParticipantTotal = participantExpenses
                            .filter(e => e.city === city)
                            .reduce((sum, e) => sum + Number(e.amount || 0), 0);
                          const cityCommonTotal = commonExpenses
                            .filter(e => e.city === city)
                            .reduce((sum, e) => sum + Number(e.amount || 0), 0);
                          const cityTotal = cityParticipantTotal + cityCommonTotal;
                          return (
                            <Fragment key={city}>
                              <td colSpan={2} className="p-2 border-r text-center font-bold">
                                {cityTotal > 0 ? formatCurrency(cityTotal) : "—"}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                      <tr className="font-bold bg-green-100 dark:bg-green-900/30">
                        <td colSpan={2} className="sticky left-0 bg-green-100 dark:bg-green-900/30 z-10 p-2 text-right">Прибыль:</td>
                        <td colSpan={4 + event.cities.length * 2} className="p-2 text-left text-lg" data-testid="text-profit">
                          {(() => {
                            // Calculate tourCost from leads, convert all to expense currency
                            const processedLeads = new Set<string>();
                            let tourCostConverted = 0;
                            participants.forEach(p => {
                              if (p.lead && !processedLeads.has(p.lead.id)) {
                                processedLeads.add(p.lead.id);
                                if (p.lead.tourCost) {
                                  const currency = p.lead.tourCostCurrency || "RUB";
                                  const amount = parseFloat(p.lead.tourCost) || 0;
                                  tourCostConverted += convertToCurrency(amount, currency, expenseCurrency);
                                }
                              }
                            });
                            
                            const participantTotal = participantExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                            const commonTotal = commonExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                            const totalExpenses = participantTotal + commonTotal;
                            const profit = tourCostConverted - totalExpenses;
                            const currencySymbol = expenseCurrency === "CNY" ? "¥" : "€";
                            return (
                              <span className={profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                {formatCurrency(profit, expenseCurrency)} {currencySymbol}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Expenses Catalog Tab - Admin only */}
        {user?.role === "admin" && (
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Каталог расходов</CardTitle>
                <CardDescription>
                  Справочник базовых расходов для использования в финансовых таблицах
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Поиск..."
                  value={baseExpenseFilter}
                  onChange={(e) => setBaseExpenseFilter(e.target.value)}
                  className="w-48"
                  data-testid="input-base-expense-filter"
                />
                <Button
                  onClick={() => {
                    setEditingBaseExpense(null);
                    setBaseExpenseForm({ name: "", amount: "", currency: "CNY", category: "" });
                    setShowBaseExpenseDialog(true);
                  }}
                  data-testid="button-add-base-expense"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить расход
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {baseExpenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Нет расходов в каталоге</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Название</th>
                        <th className="p-2 text-left font-medium">Категория</th>
                        <th className="p-2 text-right font-medium">Сумма</th>
                        <th className="p-2 text-center font-medium">Валюта</th>
                        <th className="p-2 text-center font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = baseExpenses.filter(e => 
                          !baseExpenseFilter || 
                          e.name.toLowerCase().includes(baseExpenseFilter.toLowerCase()) ||
                          (e.category?.toLowerCase().includes(baseExpenseFilter.toLowerCase()))
                        );
                        const grouped = filtered.reduce((acc, expense) => {
                          const cat = expense.category || "Без категории";
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(expense);
                          return acc;
                        }, {} as Record<string, typeof baseExpenses>);
                        
                        return Object.entries(grouped).map(([category, expenses]) => (
                          <Fragment key={category}>
                            <tr className="bg-muted/30">
                              <td colSpan={5} className="p-2 font-medium text-muted-foreground">
                                {category} ({expenses.length})
                              </td>
                            </tr>
                            {expenses.map((expense) => (
                              <tr key={expense.id} className="border-b hover-elevate" data-testid={`row-base-expense-${expense.id}`}>
                                <td className="p-2">{expense.name}</td>
                                <td className="p-2 text-muted-foreground">{expense.category || "—"}</td>
                                <td className="p-2 text-right font-mono">{formatCurrency(parseFloat(expense.amount))}</td>
                                <td className="p-2 text-center">
                                  <Badge variant="outline">{expense.currency}</Badge>
                                </td>
                                <td className="p-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingBaseExpense(null);
                                        setBaseExpenseForm({
                                          name: expense.name + " (копия)",
                                          amount: expense.amount,
                                          currency: expense.currency,
                                          category: expense.category || ""
                                        });
                                        setShowBaseExpenseDialog(true);
                                      }}
                                      title="Копировать"
                                      data-testid={`button-copy-base-expense-${expense.id}`}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingBaseExpense(expense);
                                        setBaseExpenseForm({
                                          name: expense.name,
                                          amount: expense.amount,
                                          currency: expense.currency,
                                          category: expense.category || ""
                                        });
                                        setShowBaseExpenseDialog(true);
                                      }}
                                      title="Редактировать"
                                      data-testid={`button-edit-base-expense-${expense.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      title="Удалить"
                                      onClick={() => {
                                        if (confirm("Удалить этот расход из каталога?")) {
                                          deleteBaseExpenseMutation.mutate(expense.id);
                                        }
                                      }}
                                      data-testid={`button-delete-base-expense-${expense.id}`}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* Base Expense Add/Edit Dialog */}
      <Dialog open={showBaseExpenseDialog} onOpenChange={setShowBaseExpenseDialog}>
        <DialogContent data-testid="dialog-base-expense">
          <DialogHeader>
            <DialogTitle>{editingBaseExpense ? "Редактировать расход" : "Добавить расход"}</DialogTitle>
            <DialogDescription>
              {editingBaseExpense ? "Измените данные расхода" : "Добавьте новый расход в каталог"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Название</label>
              <Input
                value={baseExpenseForm.name}
                onChange={(e) => setBaseExpenseForm({ ...baseExpenseForm, name: e.target.value })}
                placeholder="Например: Авиаперелет Пекин-Шанхай"
                data-testid="input-base-expense-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Сумма</label>
                <Input
                  type="number"
                  value={baseExpenseForm.amount}
                  onChange={(e) => setBaseExpenseForm({ ...baseExpenseForm, amount: e.target.value })}
                  placeholder="0"
                  data-testid="input-base-expense-amount"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Валюта</label>
                <Select
                  value={baseExpenseForm.currency}
                  onValueChange={(value) => setBaseExpenseForm({ ...baseExpenseForm, currency: value })}
                >
                  <SelectTrigger data-testid="select-base-expense-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">CNY (¥)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="RUB">RUB (₽)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Категория</label>
              <Input
                value={baseExpenseForm.category}
                onChange={(e) => setBaseExpenseForm({ ...baseExpenseForm, category: e.target.value })}
                placeholder="Например: Авиаперелет"
                data-testid="input-base-expense-category"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBaseExpenseDialog(false)} data-testid="button-cancel-base-expense">
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!baseExpenseForm.name || !baseExpenseForm.amount) {
                  toast({
                    title: "Ошибка",
                    description: "Заполните название и сумму",
                    variant: "destructive"
                  });
                  return;
                }
                if (editingBaseExpense) {
                  updateBaseExpenseMutation.mutate({
                    id: editingBaseExpense.id,
                    name: baseExpenseForm.name,
                    amount: baseExpenseForm.amount,
                    currency: baseExpenseForm.currency,
                    category: baseExpenseForm.category || null
                  }, {
                    onSuccess: () => {
                      toast({ title: "Расход обновлен" });
                      setShowBaseExpenseDialog(false);
                    }
                  });
                } else {
                  createBaseExpenseMutation.mutate({
                    name: baseExpenseForm.name,
                    amount: baseExpenseForm.amount,
                    currency: baseExpenseForm.currency,
                    category: baseExpenseForm.category || null
                  }, {
                    onSuccess: () => {
                      toast({ title: "Расход добавлен" });
                      setShowBaseExpenseDialog(false);
                    }
                  });
                }
              }}
              disabled={createBaseExpenseMutation.isPending || updateBaseExpenseMutation.isPending}
              data-testid="button-save-base-expense"
            >
              {(createBaseExpenseMutation.isPending || updateBaseExpenseMutation.isPending) ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense from Catalog Dialog */}
      <Dialog open={showAddExpenseFromCatalog} onOpenChange={(open) => {
        setShowAddExpenseFromCatalog(open);
        if (!open) {
          setSelectedCityForExpense("");
          setSelectedDealForExpense(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-add-expense-from-catalog">
          <DialogHeader>
            <DialogTitle>Добавить расход из каталога</DialogTitle>
            <DialogDescription>
              {selectedCityForExpense 
                ? `Добавить ${selectedDealForExpense ? "индивидуальный" : "общий"} расход в город: ${selectedCityForExpense}`
                : "Выберите расход для добавления"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedCityForExpense && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Город</label>
                <Select
                  value={selectedCityForExpense}
                  onValueChange={setSelectedCityForExpense}
                >
                  <SelectTrigger data-testid="select-expense-city">
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent>
                    {event?.cities?.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Расходы из каталога</label>
              <Input
                placeholder="Поиск..."
                value={baseExpenseFilter}
                onChange={(e) => setBaseExpenseFilter(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-60 overflow-y-auto border rounded-md">
                {baseExpenses.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">Нет расходов в каталоге</p>
                ) : (
                  (() => {
                    const filtered = baseExpenses.filter(e => 
                      !baseExpenseFilter || 
                      e.name.toLowerCase().includes(baseExpenseFilter.toLowerCase()) ||
                      (e.category?.toLowerCase().includes(baseExpenseFilter.toLowerCase()))
                    );
                    const grouped = filtered.reduce((acc, expense) => {
                      const cat = expense.category || "Без категории";
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(expense);
                      return acc;
                    }, {} as Record<string, typeof baseExpenses>);
                    
                    return Object.entries(grouped).map(([category, expenses]) => (
                      <div key={category}>
                        <div className="bg-muted px-3 py-1 text-sm font-medium text-muted-foreground sticky top-0 z-10">
                          {category}
                        </div>
                        {expenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="flex items-center justify-between p-2 hover-elevate cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              if (!selectedCityForExpense) {
                                toast({
                                  title: "Ошибка",
                                  description: "Сначала выберите город",
                                  variant: "destructive"
                                });
                                return;
                              }
                              if (selectedDealForExpense) {
                                upsertParticipantExpenseMutation.mutate({
                                  dealId: selectedDealForExpense,
                                  city: selectedCityForExpense,
                                  expenseType: expense.name,
                                  amount: expense.amount,
                                  currency: expense.currency,
                                  comment: `Из каталога: ${expense.category || ""}`
                                }, {
                                  onSuccess: () => {
                                    toast({ title: "Расход добавлен", description: `${expense.name} в ${selectedCityForExpense}` });
                                  }
                                });
                              } else {
                                upsertCommonExpenseMutation.mutate({
                                  city: selectedCityForExpense,
                                  expenseType: expense.name,
                                  amount: expense.amount,
                                  currency: expense.currency,
                                  comment: `Из каталога: ${expense.category || ""}`
                                }, {
                                  onSuccess: () => {
                                    toast({ title: "Расход добавлен", description: `${expense.name} в ${selectedCityForExpense}` });
                                  }
                                });
                              }
                            }}
                            data-testid={`catalog-expense-${expense.id}`}
                          >
                            <span className="text-sm">{expense.name}</span>
                            <Badge variant="outline">{formatCurrency(parseFloat(expense.amount))} {expense.currency}</Badge>
                          </div>
                        ))}
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpenseFromCatalog(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Tourist Details Dialog */}
      <TouristDetailsDialog
        contactId={editingContactId}
        onClose={() => setEditingContactId(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
        }}
        userRole={user?.role}
      />

      {/* Lead Edit Modal */}
      <LeadEditModal
        leadId={editingLeadId}
        open={!!editingLeadId}
        onClose={() => setEditingLeadId(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
          queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
        }}
        eventId={eventId}
      />
    </div>
  );
}

// TouristDetailsDialog Component
interface TouristDetailsDialogProps {
  contactId: string | null;
  onClose: () => void;
  onSuccess: () => void;
  userRole?: string;
}

interface ContactDetails {
  contact: Contact;
  leadTourist: LeadTourist | null;
}

function TouristDetailsDialog({ contactId, onClose, onSuccess, userRole }: TouristDetailsDialogProps) {
  const { toast } = useToast();
  
  const { data: details, isLoading } = useQuery<ContactDetails>({
    queryKey: ["/api/contacts", contactId, "details"],
    enabled: !!contactId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<LeadTourist>) => {
      return apiRequest("PATCH", `/api/contacts/${contactId}/details`, data);
    },
    onSuccess: () => {
      // Invalidate contact details cache
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "details"] });
      
      // Call parent onSuccess callback to invalidate participants cache
      onSuccess();
      
      toast({
        title: "Успешно",
        description: "Данные туриста обновлены",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить данные",
        variant: "destructive",
      });
    },
  });

  const form = useForm<Partial<LeadTourist>>({
    resolver: zodResolver(updateLeadTouristSchema.partial()),
    values: details?.leadTourist || undefined,
  });

  if (!contactId) return null;

  return (
    <Dialog open={!!contactId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать данные туриста</DialogTitle>
          <DialogDescription>
            {formatTouristName(details?.leadTourist, details?.contact?.name)}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        ) : !details?.leadTourist ? (
          <Alert variant="destructive">
            <AlertDescription>
              У этого контакта нет связанных данных туриста. Редактирование невозможно.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              {(["personal", "passport", "foreign", "additional"] as const).map((section) => {
                // Фильтруем поля по секции и по роли пользователя
                let fields = TOURIST_FIELD_DESCRIPTORS.filter((f) => f.section === section);
                
                // Если роль viewer (наблюдатель/гид), показываем только разрешенные поля
                if (userRole === "viewer") {
                  fields = fields.filter((f) => f.visibleForViewer === true);
                }
                
                if (fields.length === 0) return null;

                return (
                  <div key={section} className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">
                      {SECTION_TITLES[section]}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {fields.map((field) => {
                        // Special rendering for file upload field
                        if (field.type === "file" && field.key === "passportScans") {
                          return (
                            <div key={field.key} className="col-span-2">
                              <FormLabel>
                                {field.label} {field.required && "*"}
                              </FormLabel>
                              <PassportScansField
                                touristId={details?.leadTourist?.id || ""}
                                contactId={contactId}
                                initialScans={details?.leadTourist?.passportScans || []}
                                onUpdate={(scans) => {
                                  form.setValue("passportScans", scans);
                                }}
                              />
                            </div>
                          );
                        }

                        // Regular field rendering
                        return (
                          <FormField
                            key={field.key}
                            control={form.control}
                            name={field.key as any}
                            render={({ field: formField }) => (
                              <FormItem className={field.type === "textarea" ? "col-span-2" : ""}>
                                <FormLabel>
                                  {field.label} {field.required && "*"}
                                </FormLabel>
                                <FormControl>
                                  {field.type === "select" ? (
                                    <Select
                                      onValueChange={formField.onChange}
                                      value={formField.value || ""}
                                    >
                                      <SelectTrigger data-testid={field.testId}>
                                        <SelectValue placeholder="Выберите" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.selectOptions?.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : field.type === "textarea" ? (
                                    <Textarea
                                      placeholder={field.placeholder}
                                      {...formField}
                                      value={formField.value || ""}
                                      data-testid={field.testId}
                                    />
                                  ) : (
                                    <Input
                                      type={field.type || "text"}
                                      placeholder={field.placeholder}
                                      {...formField}
                                      value={formField.value || ""}
                                      data-testid={field.testId}
                                    />
                                  )}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel-tourist-edit"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !details?.leadTourist}
                  data-testid="button-submit-tourist-edit"
                >
                  {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
