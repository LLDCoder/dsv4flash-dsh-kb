import { useState, useEffect } from "react";
import type { FormInstance } from "antd/lib/form";
import {
  getEmirateList,
  getRegionList,
  getAreaList,
  getNationalityList,
  type EmirateItem,
  type RegionItem,
  type AreaItem,
  type NationalityInfo,
} from "@/services/userProfile";

export interface AddressData {
  emirateList: EmirateItem[];
  allRegionList: RegionItem[];
  allAreaList: AreaItem[];
  filteredRegionList: RegionItem[];
  filteredAreaList: AreaItem[];
  selectedEmirateId: number | undefined;
  selectedRegionId: number | undefined;
  nationalityList: NationalityInfo[];
  loadingNationalities: boolean;
  isAddressDataLoaded: boolean;
  setSelectedEmirateId: (id: number | undefined) => void;
  setSelectedRegionId: (id: number | undefined) => void;
  handleEmirateChange: (value: number) => void;
  handleRegionChange: (value: number) => void;
}

export function useAddressData(form: FormInstance): AddressData {
  const [emirateList, setEmirateList] = useState<EmirateItem[]>([]);
  const [allRegionList, setAllRegionList] = useState<RegionItem[]>([]);
  const [allAreaList, setAllAreaList] = useState<AreaItem[]>([]);
  const [filteredRegionList, setFilteredRegionList] = useState<RegionItem[]>([]);
  const [filteredAreaList, setFilteredAreaList] = useState<AreaItem[]>([]);
  const [selectedEmirateId, setSelectedEmirateId] = useState<number | undefined>();
  const [selectedRegionId, setSelectedRegionId] = useState<number | undefined>();
  const [nationalityList, setNationalityList] = useState<NationalityInfo[]>([]);
  const [loadingNationalities, setLoadingNationalities] = useState(false);
  const [isAddressDataLoaded, setIsAddressDataLoaded] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoadingNationalities(true);
        const [emirateResponse, regionResponse, areaResponse, nationalityResponse] =
          await Promise.all([
            getEmirateList(),
            getRegionList(),
            getAreaList(),
            getNationalityList(),
          ]);

        if (emirateResponse.data) setEmirateList(emirateResponse.data);
        if (regionResponse.data) setAllRegionList(regionResponse.data);
        if (areaResponse.data) setAllAreaList(areaResponse.data);
        if (nationalityResponse.data) setNationalityList(nationalityResponse.data);
      } catch (error) {
        console.error("Failed to load address/nationality data:", error);
      } finally {
        setLoadingNationalities(false);
        setIsAddressDataLoaded(true);
      }
    };

    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedEmirateId && allRegionList.length > 0) {
      setFilteredRegionList(
        allRegionList.filter((r) => r.emirateId === selectedEmirateId)
      );
    } else {
      setFilteredRegionList([]);
    }
  }, [selectedEmirateId, allRegionList]);

  useEffect(() => {
    if (selectedRegionId && allAreaList.length > 0) {
      setFilteredAreaList(
        allAreaList.filter((a) => a.regionId === selectedRegionId)
      );
    } else {
      setFilteredAreaList([]);
    }
  }, [selectedRegionId, allAreaList]);

  const handleEmirateChange = (value: number) => {
    setSelectedEmirateId(value);
    setSelectedRegionId(undefined);
    form.setFieldsValue({ addressRegion: undefined, addressArea: undefined });
  };

  const handleRegionChange = (value: number) => {
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
    nationalityList,
    loadingNationalities,
    isAddressDataLoaded,
    setSelectedEmirateId,
    setSelectedRegionId,
    handleEmirateChange,
    handleRegionChange,
  };
}
