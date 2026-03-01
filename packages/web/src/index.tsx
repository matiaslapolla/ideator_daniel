import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Generate from "./pages/Generate";
import IdeaDetail from "./pages/IdeaDetail";
import History from "./pages/History";
import RunDetail from "./pages/RunDetail";
import Settings from "./pages/Settings";

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={Dashboard} />
      <Route path="/generate" component={Generate} />
      <Route path="/ideas/:id" component={IdeaDetail} />
      <Route path="/history" component={History} />
      <Route path="/history/:runId" component={RunDetail} />
      <Route path="/settings" component={Settings} />
    </Router>
  ),
  document.getElementById("root")!
);
