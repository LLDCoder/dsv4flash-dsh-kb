import request from "@/utils/request";

export interface TypeDictionary {
  id: number;
  code: string;
  scope: string;
  nameEn: string;
  nameAr: string;
  isShown: boolean;
  descAr: string;
  descEn: string;
}

export const getTypeDictionaries = (type: string) => {
  return request.get<TypeDictionary[]>(
    `/api/TypeDictionary/GetTypeDictionaries/${type}`
  );
};

export const GetNationalityList = () => {
  return request.get<TypeDictionary[]>(
    `/api/UserManagement/GetNationalityList`
  );
};

export const GetPorts = () => {
  return request.get<TypeDictionary[]>(`/api/ServiceInfo/GetPorts`);
};
