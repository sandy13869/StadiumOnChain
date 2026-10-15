import { StatusMessage } from "../types";

interface StatusBarProps {
  status: StatusMessage;
}

export default function StatusBar({ status }: StatusBarProps) {
  return (
    <div
      className={`status-bar ${status.type}`}
      role={status.type === "error" ? "alert" : "status"}
    >
      {status.message}
    </div>
  );
}
