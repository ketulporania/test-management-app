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

    form = this.fb.group({
        name: ['', Validators.required],
        subject: ['', Validators.required],
        type: ['', Validators.required],
        topic: [''],
        sub_topic: [''],
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
                        wrong_marks: test.wrong_marks ?? -1,
                        unattempt_marks: test.unattempt_marks ?? 0,
                        correct_marks: test.correct_marks ?? 5,
                        total_questions: test.total_questions ?? null,
                        total_marks: test.total_marks ?? null,
                    });

                    if (resolvedSubjectId) {
                        this.subjectService.getTopicsBySubject(resolvedSubjectId).subscribe((topicsRes) => {
                            this.topics.set(topicsRes.data);

                            const rawTopics = test.topics || [];
                            const resolvedTopicId = rawTopics.length
                                ? (topicsRes.data.find((t) => t.id === rawTopics[0])?.id ||
                                    topicsRes.data.find((t) =>
                                        t.name.toLowerCase() === rawTopics[0]?.toLowerCase(),
                                    )?.id || rawTopics[0])
                                : '';

                            if (resolvedTopicId) {
                                this.form.patchValue({ topic: resolvedTopicId });

                                this.subjectService.getSubTopicsByTopicList([resolvedTopicId]).subscribe((subRes) => {
                                    this.subTopics.set(subRes.data);

                                    const rawSubTopics = test.sub_topics || [];
                                    const resolvedSubTopicId = rawSubTopics.length
                                        ? (subRes.data.find((st) => st.id === rawSubTopics[0])?.id ||
                                            subRes.data.find((st) =>
                                                st.name.toLowerCase() === rawSubTopics[0]?.toLowerCase(),
                                            )?.id || rawSubTopics[0])
                                        : '';

                                    if (resolvedSubTopicId) {
                                        this.form.patchValue({ sub_topic: resolvedSubTopicId });
                                    }
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
        this.form.patchValue({ topic: '', sub_topic: '' });

        if (subjectId) {
            this.subjectService.getTopicsBySubject(subjectId).subscribe((res) =>
                this.topics.set(res.data),
            );
        }
    }

    onTopicChange(event: Event) {
        const topicId = (event.target as HTMLSelectElement).value;
        this.subTopics.set([]);
        this.form.patchValue({ sub_topic: '' });

        if (topicId) {
            this.subjectService.getSubTopicsByTopicList([topicId]).subscribe((res) =>
                this.subTopics.set(res.data),
            );
        }
    }

    increment(field: string) {
        const current = this.form.get(field)?.value ?? 0;
        this.form.get(field)?.setValue(+current + 1);
    }

    decrement(field: string) {
        const current = this.form.get(field)?.value ?? 0;
        this.form.get(field)?.setValue(+current - 1);
    }

    onCancel() {
        this.router.navigate(['/tests']);
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
            topics: val.topic ? [val.topic] : [],
            sub_topics: val.sub_topic ? [val.sub_topic] : [],
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
                    this.toast.error(apiError.errors[0]?.msg);
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
                    this.toast.error(apiError.errors[0]?.msg);
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
