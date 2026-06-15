import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';
export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
    {
        path: '', component: LayoutComponent, canActivate: [authGuard], children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
            { path: 'tests/new', loadComponent: () => import('./pages/test-form/test-form.component').then(m => m.TestFormComponent) },
            { path: 'tests/:id/edit', loadComponent: () => import('./pages/test-form/test-form.component').then(m => m.TestFormComponent) },
            { path: 'tests/:id/questions', loadComponent: () => import('./pages/add-questions/add-questions.component').then(m => m.AddQuestionsComponent) },
            { path: 'tests/:id/preview', loadComponent: () => import('./pages/preview-publish/preview-publish.component').then(m => m.PreviewPublishComponent) }
        ]
    },
    { path: '**', redirectTo: 'dashboard' }
];
