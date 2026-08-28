import request from "@/utils/request";

export const userEnterGlobalView = () => {
  return request.post("/api/User/EnterGlobalView");
};
