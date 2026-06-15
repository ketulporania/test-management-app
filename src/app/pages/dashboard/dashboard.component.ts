import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TestService } from '../../core/services/test.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Test } from '../../models';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { Shimmer } from '../../shared/components/shimmer/shimmer';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, DatePipe, BsDropdownModule, Shimmer],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  router = inject(Router);
  authService = inject(AuthService);
  private testService = inject(TestService);
  private toast = inject(ToastService);

  tests = signal<Test[]>([]);
  loading = signal(true);

 searchQuery = signal('');
 currentPage = signal(1); pageSize=10;

 pagedTests = computed(()=>{ const s=(this.currentPage() - 1 ) * this.pageSize; 
              return this.filteredTests().slice(s, s + this.pageSize);
            });
 totalPages = computed(()=> Math.max(1,Math.ceil(this.filteredTests().length / this.pageSize)));

 filteredTests = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.tests();

    return this.tests().filter((t) => {
      const name = (t.name || '').toLowerCase();
      const subject =
        typeof t.subject === 'string'
          ? t.subject.toLowerCase()
          : ((t.subject as { name?: string })?.name || '').toLowerCase();
      const status = (t.status || 'draft').toLowerCase();

      return name.includes(query) || subject.includes(query) || status.includes(query);
    });
  });

  ngOnInit() {
    this.loadTests();
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
  }

  loadTests() {
    this.loading.set(true);
    this.testService.getAll().subscribe({
      next: (res) => {
        this.tests.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load tests');
        this.loading.set(false);
      },
    });
  }

  onDelete(id: string) {
    Swal.fire({
      title: 'Delete Test?',
      text: 'This test and all its questions will be permanently deleted. This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete it',
      cancelButtonText: 'No, Keep it',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    }).then((result:any) => {
      if (result.isConfirmed) {
        this.testService.delete(id).subscribe({
          next: () => {
            this.toast.success('Test deleted successfully');
            this.loadTests();
          },
          error: (err) => this.toast.error(err.error.message || 'Failed to delete test'),
        });
      }
    });
  }

  getPagination(): (number | string)[] {
    const total = this.totalPages();
    const current = this.currentPage();
  
    const pages: (number | string)[] = [];
  
    // Always show first page
    pages.push(1);
  
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);
  
    if (start > 2) {
      pages.push('...');
    }
  
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
  
    if (end < total - 1) {
      pages.push('...');
    }
  
    // Always show last page
    if (total > 1) {
      pages.push(total);
    }
  
    return pages;
  }
  
}
