import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
    OnInit,
    Input,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { SubjectService } from '../../core/services/subject.service';
import { TestService } from '../../core/services/test.service';
import { TestStateService } from '../../core/services/test-state.service';
import { ToastService } from '../../core/services/toast.service';
import { Subject, Topic, SubTopic, Test } from '../../models';
import { Shimmer } from '../../shared/components/shimmer/shimmer';

@Component({
    selector: 'app-test-form',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, Shimmer],
    templateUrl: './test-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestFormComponent implements OnInit {
    @Input() id?: string;
    loading = signal(true);

    router = inject(Router);
    location = inject(Location);
    private fb = inject(FormBuilder);
    private subjectService = inject(SubjectService);
    private testService = inject(TestService);
    private stateService = inject(TestStateService);
    private toast = inject(ToastService);

    subjects = signal<Subject[]>([]);
    topics = signal<Topic[]>([]);
    subTopics = signal<SubTopic[]>([]);
    saving = signal(false);
    errorMsg = signal('');

    selectedTopicIds = signal<string[]>([]);
    selectedSubTopicIds = signal<string[]>([]);

    form = this.fb.group({
        name: ['', Validators.required],
        subject: ['', Validators.required],
        type: ['', Validators.required],
        total_time: [null as number | null, Validators.required],
        difficulty: ['easy'],
        wrong_marks: [null as number | null, Validators.required],
        unattempt_marks: [null as number | null, Validators.required],
        correct_marks: [null as number | null, Validators.required],
        total_questions: [null as number | null, Validators.required],
        total_marks: [null as number | null, Validators.required],
    });

    ngOnInit() {
        this.loadSubjects();
        if (this.id) {
            this.loadExistingTest();
        }
    }

    private loadSubjects() {
        this.subjectService.getSubjects().subscribe((res) => {
            if (res?.data) {
                this.subjects.set(res.data);
                if (!this.id) this.loading.set(false);
            } else {
                this.loading.set(false);
            }
        });
    }

    private loadExistingTest() {
        this.testService.getById(this.id!).subscribe({
            next: (res) => {
                const test = res.data;
                this.stateService.setCurrentTest(test);

                this.subjectService.getSubjects().subscribe((subjectsRes) => {
                    const rawSubject = typeof test.subject === 'string'
                        ? test.subject
                        : (test.subject as any)?.id;

                    const matchById = subjectsRes.data.find((s) => s.id === rawSubject);
                    const resolvedSubjectId = matchById
                        ? matchById.id
                        : subjectsRes.data.find(
                            (s) => s.name.toLowerCase() === rawSubject?.toLowerCase(),
                        )?.id || rawSubject;

                    this.form.patchValue({
                        name: test.name,
                        subject: resolvedSubjectId,
                        type: test.type || '',
                        difficulty: test.difficulty || 'easy',
                        total_time: test.total_time ?? null,
                        wrong_marks: test.wrong_marks ?? null,
                        unattempt_marks: test.unattempt_marks ?? null,
                        correct_marks: test.correct_marks ?? null,
                        total_questions: test.total_questions ?? null,
                        total_marks: test.total_marks ?? null,
                    });

                    if (resolvedSubjectId) {
                        this.subjectService.getTopicsBySubject(resolvedSubjectId).subscribe((topicsRes) => {
                            this.topics.set(topicsRes.data);

                            const rawTopics = test.topics || [];
                            const resolvedTopicIds = rawTopics
                                .map((rt: string) =>
                                    topicsRes.data.find((t) => t.id === rt)?.id ||
                                    topicsRes.data.find((t) => t.name.toLowerCase() === rt?.toLowerCase())?.id ||
                                    rt
                                )
                                .filter(Boolean);

                            this.selectedTopicIds.set(resolvedTopicIds);

                            if (resolvedTopicIds.length > 0) {
                                this.subjectService.getSubTopicsByTopicList(resolvedTopicIds).subscribe((subRes) => {
                                    this.subTopics.set(subRes.data);

                                    const rawSubTopics = test.sub_topics || [];
                                    const resolvedSubTopicIds = rawSubTopics
                                        .map((rst: string) =>
                                            subRes.data.find((st) => st.id === rst)?.id ||
                                            subRes.data.find((st) => st.name.toLowerCase() === rst?.toLowerCase())?.id ||
                                            rst
                                        )
                                        .filter(Boolean);

                                    this.selectedSubTopicIds.set(resolvedSubTopicIds);
                                });
                            }
                        });
                    }
                    this.loading.set(false);
                });
            },
            error: () => this.errorMsg.set('Failed to load test'),
        });
    }

    onSubjectChange(event: Event) {
        const subjectId = (event.target as HTMLSelectElement).value;
        this.topics.set([]);
        this.subTopics.set([]);
        this.selectedTopicIds.set([]);
        this.selectedSubTopicIds.set([]);

        if (subjectId) {
            this.subjectService.getTopicsBySubject(subjectId).subscribe((res) =>
                this.topics.set(res.data),
            );
        }
    }

    onTopicToggle(topicId: string) {
        const current = this.selectedTopicIds();
        const updated = current.includes(topicId)
            ? current.filter(id => id !== topicId)
            : [...current, topicId];

        this.selectedTopicIds.set(updated);
        this.selectedSubTopicIds.set([]);
        this.subTopics.set([]);

        if (updated.length > 0) {
            this.subjectService.getSubTopicsByTopicList(updated).subscribe((res) =>
                this.subTopics.set(res.data),
            );
        }
    }

    onSubTopicToggle(subTopicId: string) {
        const current = this.selectedSubTopicIds();
        const updated = current.includes(subTopicId)
            ? current.filter(id => id !== subTopicId)
            : [...current, subTopicId];
        this.selectedSubTopicIds.set(updated);
    }

    isTopicSelected(topicId: string): boolean {
        return this.selectedTopicIds().includes(topicId);
    }

    isSubTopicSelected(subTopicId: string): boolean {
        return this.selectedSubTopicIds().includes(subTopicId);
    }

    getTopicName(id: string): string {
        return this.topics().find(t => t.id === id)?.name || id;
    }
      
    getSubTopicName(id: string): string {
        return this.subTopics().find(st => st.id === id)?.name || id;
    }

    onNext(draftOnly: boolean) {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (!draftOnly) this.saving.set(true);
        this.errorMsg.set('');

        const val = this.form.value;
        const payload = {
            name: val.name!,
            type: val.type!,
            subject: val.subject!,
            topics: this.selectedTopicIds(),        
            sub_topics: this.selectedSubTopicIds(), 
            difficulty: val.difficulty || 'easy',
            total_time: val.total_time ?? 0,
            wrong_marks: val.wrong_marks ?? -1,
            unattempt_marks: val.unattempt_marks ?? 0,
            correct_marks: val.correct_marks ?? 5,
            total_questions: val.total_questions ?? 0,
            total_marks: val.total_marks ?? 0,
            status: draftOnly ? 'draft' : 'unpublished',
        };

        if (this.id) {
            this.testService.update(this.id, payload as Partial<Test>).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.toast.success(draftOnly ? 'Test saved as draft' : 'Test updated');
                    if (draftOnly) {
                        this.router.navigate(['/dashboard']);
                    } else {
                        this.router.navigate(['/tests', this.id, 'questions']);
                    }
                },
                error: (err) => {
                    const apiError = err.error;
                    this.toast.error(apiError.errors?.[0]?.msg || 'Failed to update test');
                    this.saving.set(false);
                },
            });
        } else {
            this.testService.create(payload as Partial<Test>).subscribe({
                next: (res) => {
                    const testId = res.data.id;
                    this.stateService.setCurrentTest(res.data);
                    this.saving.set(false);
                    this.toast.success(draftOnly ? 'Test saved as draft' : 'Test created');
                    if (draftOnly) {
                        this.router.navigate(['/dashboard']);
                    } else {
                        this.router.navigate(['/tests', testId, 'questions']);
                    }
                },
                error: (err) => {
                    const apiError = err.error;
                    this.toast.error(apiError.errors?.[0]?.msg || 'Failed to create test');
                    this.saving.set(false);
                },
            });
        }
    }

    goBack() {
        if (this.id) {
            this.router.navigate(['/dashboard']);
        } else {
            this.location.back();
        }
    }
}