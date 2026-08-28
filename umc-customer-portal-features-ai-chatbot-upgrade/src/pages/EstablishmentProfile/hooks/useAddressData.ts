import { useState, useEffect } from "react";
import {
  getEmirateList,
  getRegionList,
  getAreaList,
  type EmirateItem,
  type RegionItem,
  type AreaItem,
} from "@/services/userProfile";
import type { FormInstance } from "antd";

export interface UseAddressDataReturn {
  emirateList: EmirateItem[];
  allRegionList: RegionItem[];
  allAreaList: AreaItem[];
  filteredRegionList: RegionItem[];
  filteredAreaList: AreaItem[];
  selectedEmirateId: number | undefined;
  selectedRegionId: number | undefined;
  setSelectedEmirateId: (id: number | undefined) => void;
  setSelectedRegionId: (id: number | undefined) => void;
  setFilteredRegionList: (list: RegionItem[]) => void;
  setFilteredAreaList: (list: AreaItem[]) => void;
  handleEmirateChange: (value: number, form: FormInstance) => void;
  handleRegionChange: (value: number, form: FormInstance) => void;
}

export const useAddressData = (): UseAddressDataReturn => {
  const [emirateList, setEmirateList] = useState<EmirateItem[]>([]);
  const [allRegionList, setAllRegionList] = useState<RegionItem[]>([]);
  const [allAreaList, setAllAreaList] = useState<AreaItem[]>([]);
  const [filteredRegionList, setFilteredRegionList] = useState<RegionItem[]>([]);
  const [filteredAreaList, setFilteredAreaList] = useState<AreaItem[]>([]);
  const [selectedEmirateId, setSelectedEmirateId] = useState<number | undefined>();
  const [selectedRegionId, setSelectedRegionId] = useState<number | undefined>();

  useEffect(() => {
    const load = async () => {
      try {
        const [emirateResponse, regionResponse, areaResponse] = await Promise.all([
          getEmirateList(),
          getRegionList(),
          getAreaList(),
        ]);
        if (emirateResponse.data) setEmirateList(emirateResponse.data);
        if (regionResponse.data) setAllRegionList(regionResponse.data);
        if (areaResponse.data) setAllAreaList(areaResponse.data);
      } catch (error) {
        console.error("Failed to load address data:", error);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedEmirateId) {
      setFilteredRegionList(
        allRegionList.filter((r) => r.emirateId === selectedEmirateId),
      );
    } else {
      setFilteredRegionList([]);
      setFilteredAreaList([]);
    }
  }, [selectedEmirateId, allRegionList]);

  useEffect(() => {
    if (selectedRegionId) {
      setFilteredAreaList(
        allAreaList.filter((a) => a.regionId === selectedRegionId),
      );
    } else {
      setFilteredAreaList([]);
    }
  }, [selectedRegionId, allAreaList]);

  const handleEmirateChange = (value: number, form: FormInstance) => {
    setSelectedEmirateId(value);
    setSelectedRegionId(undefined);
    form.setFieldsValue({ addressRegion: undefined, addressArea: undefined });
  };

  const handleRegionChange = (value: number, form: FormInstance) => {
    setSelectedRegionId(value);
    form.setFieldsValue({ addressArea: undefined });
  };

  return {
    emirateList,
    allRegionList,
    allAreaList,
    filteredRegionList,
    filteredAreaList,
    selectedEmirateId,
    selectedRegionId,
    setSelectedEmirateId,
    setSelectedRegionId,
    setFilteredRegionList,
    setFilteredAreaList,
    handleEmirateChange,
    handleRegionChange,
  };
};
