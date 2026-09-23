/** Root router component for the Luma web application. */
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";

export function App() {
  return <RouterProvider router={router} />;
}
