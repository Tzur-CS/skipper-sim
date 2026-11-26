import { useEffect } from 'react';
import { useApp } from './store/appStore';
import { Home } from './screens/Home';
import { ScenarioSelect } from './screens/ScenarioSelect';
import { SimScreen } from './screens/SimScreen';
import { Results } from './screens/Results';
import { Settings } from './screens/Settings';
import { Learn } from './screens/Learn';
import { ScenarioProgress } from './screens/ScenarioProgress';

export function App() {
  const screen = useApp((s) => s.screen);
  const lang = useApp((s) => s.settings.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);
  switch (screen) {
    case 'home':
      return <Home />;
    case 'select':
      return <ScenarioSelect />;
    case 'sim':
      return <SimScreen />;
    case 'results':
      return <Results />;
    case 'settings':
      return <Settings />;
    case 'learn':
      return <Learn />;
    case 'progress':
      return <ScenarioProgress />;
  }
}
