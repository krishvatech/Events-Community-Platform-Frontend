// src/navigation/reactRouter.js
// Default target of the "#navigation" import (package.json "imports").
// Vite, Node tests and esbuild resolve "#navigation" here, so shared components
// keep using React Router exactly as before. Next.js aliases "#navigation" to
// ./next.jsx instead (see next.config.mjs).
export {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
