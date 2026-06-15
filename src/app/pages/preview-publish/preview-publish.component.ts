import { ChangeDetectionStrategy, Component, inject, signal, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { TestService } from '../../core/services/test.service';
import { QuestionService } from '../../core/services/question.service';
import { TestStateService } from '../../core/services/test-state.service';
import { ToastService } from '../../core/services/toast.service';
import { Test, Question } from '../../models';
import { Location, NgClass } from '@angular/common';
import { Shimmer } from '../../shared/components/shimmer/shimmer';

@Component({
  selector: 'app-preview-publish',
  imports: [NgClass, Shimmer],
  templateUrl: './preview-publish.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPublishComponent implements OnInit {
  @Input() id!: string;

  router = inject(Router);
  private testService = inject(TestService);
  private questionService = inject(QuestionService);
  private stateService = inject(TestStateService);
  private toast = inject(ToastService);
  location = inject(Location)

  test = signal<Test | null>(null);
  questions = signal<Question[]>([]);
  loading = signal(true);
  publishing = signal(false);
  published = signal(false);

  optKeys: Array<'option1' | 'option2' | 'option3' | 'option4'> = [
    'option1', 'option2', 'option3', 'option4',
  ];
  optLabels = ['A', 'B', 'C', 'D'];

  getOption(q: Question, key: 'option1' | 'option2' | 'option3' | 'option4'): string {
    return q[key];
  }

  ngOnInit() {
    this.testService.getById(this.id).subscribe({
      next: (res) => {
        const t = res.data;
        this.test.set(t);
        if (t.questions?.length) {
          this.questionService.fetchBulk(t.questions).subscribe({
            next: (qRes) => {
              this.questions.set(qRes.data);
              this.loading.set(false);
            },
            error: () => {
              this.toast.error('Failed to load questions');
              this.loading.set(false);
            },
          });
        } else {
          this.questions.set(this.stateService.questions());
          this.loading.set(false);
        }
      },
      error: () => {
        this.toast.error('Failed to load test');
        this.loading.set(false);
      },
    });
  }

  onPublish() {
    this.publishing.set(true);
    this.testService.publish(this.id).subscribe({
      next: () => {
        this.test.update((t) => (t ? { ...t, status: 'live' } : t));
        this.published.set(true);
        this.toast.success('Test published successfully!');
        this.stateService.reset();
        this.publishing.set(false);
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      },
      error: () => {
        this.toast.error('Failed to publish test');
        this.publishing.set(false);
      },
    });
  }

  goBack() {
    this.location.back()
  }
}
