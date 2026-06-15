import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { filter } from 'rxjs';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './layout.component.html'
})
export class LayoutComponent {
    router = inject(Router);
    auth = inject(AuthService);

    pageTitle = signal('Dashboard');

    sidebarOpen = false;

    private titleMap: { pattern: RegExp; title: string }[] = [
        { pattern: /^\/dashboard$/, title: 'Dashboard' },
        { pattern: /^\/tests\/new$/, title: 'Create Test' },
        { pattern: /^\/tests\/[^/]+\/edit$/, title: 'Edit Test' },
        { pattern: /^\/tests\/[^/]+\/questions$/, title: 'Questions' },
        { pattern: /^\/tests\/[^/]+\/preview$/, title: 'Preview' },
    ];


    ngOnInit() {
        this.updateTitle(this.router.url);
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                this.updateTitle(event.urlAfterRedirects);
            });
    }

    isActive(paths: string[]) {
        return paths.some(p => this.router.url.includes(p));
    }

    private updateTitle(url: string) {
        const match = this.titleMap.find(item => item.pattern.test(url));
        this.pageTitle.set(match ? match.title : '');
    }
}
