import { useContext } from "react";
import ToastContext from "./ToastContextValue.js";

export function useToast() {
  return useContext(ToastContext);
}
