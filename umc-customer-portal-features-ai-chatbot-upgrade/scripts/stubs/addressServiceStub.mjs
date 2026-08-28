const response = (data) => Promise.resolve({ data });

export const getEmirateList = () =>
  response([{ id: 1, nameEn: "Abu Dhabi", nameAr: "Abu Dhabi" }]);

export const getAllEmirateList = getEmirateList;

export const getRegionList = () =>
  response([{ id: 10, emirateId: 1, nameEn: "Abu Dhabi", nameAr: "Abu Dhabi" }]);

export const getAreaList = () =>
  response([{ id: 100, regionId: 10, nameEn: "Area", nameAr: "Area" }]);
