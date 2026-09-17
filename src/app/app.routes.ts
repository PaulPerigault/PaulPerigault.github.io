import { Routes } from '@angular/router';
import { PortfolioPage } from './pages/portfolio-page/portfolio-page';

export const routes: Routes = [
  { path: '', redirectTo: 'fr', pathMatch: 'full' },
  { path: 'fr', component: PortfolioPage, data: { lang: 'fr' } },
  { path: 'en', component: PortfolioPage, data: { lang: 'en' } },
  { path: '**', redirectTo: 'fr' },
];
