import { useQuery } from "@tanstack/react-query";
import type { SystemDictionary, DictionaryTypeConfig } from "@shared/schema";

export function useSystemDictionary(type: string) {
  return useQuery<SystemDictionary[]>({
    queryKey: ["/api/public/dictionaries", type],
    enabled: !!type,
  });
}

export function useDictionaryTypeConfig(type: string) {
  return useQuery<DictionaryTypeConfig>({
    queryKey: ["/api/public/dictionary-type-config", type],
    enabled: !!type,
  });
}

export function useDictionaryMap(type: string): Record<string, string> {
  const { data: items = [] } = useSystemDictionary(type);
  return items.reduce((acc, item) => {
    acc[item.value] = item.label;
    return acc;
  }, {} as Record<string, string>);
}

export function useDictionaryOptions(type: string): { value: string; label: string }[] {
  const { data: items = [] } = useSystemDictionary(type);
  return items.map(item => ({ value: item.value, label: item.label }));
}
