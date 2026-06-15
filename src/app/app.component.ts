import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { LoadingService } from './core/services/loading.service';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToastComponent, LoadingSpinnerComponent],
    templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
    loadingService = inject(LoadingService);
    private router = inject(Router);
    private titleService = inject(Title);

    private titleMap: { pattern: RegExp; title: string }[] = [
        { pattern: /^\/login$/, title: 'Login' },
        { pattern: /^\/dashboard$/, title: 'Dashboard' },
        { pattern: /^\/tests\/new$/, title: 'Create Test' },
        { pattern: /^\/tests\/[^/]+\/edit$/, title: 'Edit Test' },
        { pattern: /^\/tests\/[^/]+\/questions$/, title: 'Questions' },
        { pattern: /^\/tests\/[^/]+\/preview$/, title: 'Preview' },
    ];

    private readonly appName = 'Test Management';

    ngOnInit() {
        this.updateTitle(this.router.url);

        this.router.events.subscribe(event => {

            if (event instanceof NavigationEnd) {
                this.updateTitle(event.urlAfterRedirects);

                if (this.loadingService.isLoading()) {
                    setTimeout(() => this.loadingService.hide(), 300);
                }
            }

            if (event instanceof NavigationCancel || event instanceof NavigationError) {
                if (this.loadingService.isLoading()) {
                    setTimeout(() => this.loadingService.hide(), 300);
                }
            }

        });
    }

    private updateTitle(url: string) {
        const match = this.titleMap.find(item => item.pattern.test(url));
        const pageTitle = match ? match.title : 'Test Management';
        this.titleService.setTitle(`${pageTitle} | ${this.appName}`);
    }
}