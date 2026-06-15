import { ChangeDetectionStrategy, Component, inject, signal, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionService } from '../../core/services/question.service';
import { TestService } from '../../core/services/test.service';
import { TestStateService } from '../../core/services/test-state.service';
import { SubjectService } from '../../core/services/subject.service';
import { ToastService } from '../../core/services/toast.service';
import { Question, Topic, SubTopic } from '../../models';
import { Shimmer } from '../../shared/components/shimmer/shimmer';
import { Location } from '@angular/common';

@Component({
  selector: 'app-add-questions',
  imports: [ReactiveFormsModule, Shimmer],
  templateUrl: './add-questions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddQuestionsComponent implements OnInit {
  @ViewChild('questionForm') questionFormRef!: ElementRef;
  @Input() id!: string;
  loading = signal(true);

  router = inject(Router);
  private route = inject(ActivatedRoute);
  stateService = inject(TestStateService);
  private fb = inject(FormBuilder);
  private questionService = inject(QuestionService);
  private testService = inject(TestService);
  private subjectService = inject(SubjectService);
  private toast = inject(ToastService);
  location = inject(Location)

  editIndex = signal<number | null>(null);
  saving = signal(false);
  errorMsg = signal('');
  topics = signal<Topic[]>([]);
  subTopics = signal<SubTopic[]>([]);
  subjectId = signal<string>('');

  get testId() {
    return this.id;
  }

  optionLabels = [
    { key: 'option1' as const, label: 'Option A' },
    { key: 'option2' as const, label: 'Option B' },
    { key: 'option3' as const, label: 'Option C' },
    { key: 'option4' as const, label: 'Option D' },
  ];

  qForm = this.fb.group({
    question: ['', Validators.required],
    option1: ['', Validators.required],
    option2: ['', Validators.required],
    option3: ['', Validators.required],
    option4: ['', Validators.required],
    correct_option: ['', Validators.required],
    explanation: [''],
    difficulty: [''],
    topic_id: [''],
    sub_topic_id: [''],
    media_url: [''],
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id')!;
      this.loadTestContext();
    });
  }

  private loadTestContext() {

    if (!this.id) {
      this.loading.set(false)
      return;
    }
  
    // Clear previous state when opening another test
    this.stateService.setQuestions([]);
    this.stateService.setCurrentTest(null as any);
  
    const loadFromTest = (
      test: {
        subject: string;
        topics?: string[];
        questions?: string[];
      }
    ) => {
  
      const rawSubject =
        typeof test.subject === 'string'
          ? test.subject
          : (test.subject as { id: string }).id;
  
      if (rawSubject) {
  
        this.subjectService.getSubjects().subscribe((subjectsRes) => {
  
          const matchById = subjectsRes.data.find(
            (s) => s.id === rawSubject
          );
  
          const resolvedSubjectId =
            matchById?.id ||
            subjectsRes.data.find(
              (s) =>
                s.name.toLowerCase() ===
                rawSubject.toLowerCase()
            )?.id ||
            rawSubject;
  
          this.subjectId.set(resolvedSubjectId);
  
          this.subjectService
            .getTopicsBySubject(resolvedSubjectId)
            .subscribe((res) => {
  
              this.topics.set(res.data);
  
              const rawTopicIds = test.topics || [];
  
              if (rawTopicIds.length > 0) {
  
                const resolvedTopicIds = rawTopicIds.map(
                  (rawTopic) => {
  
                    const matchById = res.data.find(
                      (t) => t.id === rawTopic
                    );
  
                    return (
                      matchById?.id ||
                      res.data.find(
                        (t) =>
                          t.name.toLowerCase() ===
                          rawTopic.toLowerCase()
                      )?.id ||
                      rawTopic
                    );
                  }
                );
  
                this.subjectService
                  .getSubTopicsByTopicList(resolvedTopicIds)
                  .subscribe((subRes) =>
                    this.subTopics.set(subRes.data)
                  );
              }
            });
        });
      }
  
      // Always load questions for current test
      if (test.questions?.length) {
  
        this.questionService
          .fetchBulk(test.questions)
          .subscribe((qRes) => {
  
            this.stateService.setQuestions(qRes.data);
            this.loading.set(false)
          });
      } else {
        this.stateService.setQuestions([]);
        this.loading.set(false)
      }
    };
  
    this.testService.getById(this.id).subscribe({
      next: (res) => {
  
        this.stateService.setCurrentTest(res.data);
  
        loadFromTest(res.data);
  
      },
      error: () =>
        this.errorMsg.set('Failed to load test'),
    });
  }

  onTopicChange(event: Event) {
    const topicId = (event.target as HTMLSelectElement).value;
    this.qForm.patchValue({ sub_topic_id: '' });
    if (topicId) {
      // POST /sub-topics/multi-topics { topicIds: [topicId] }
      this.subjectService.getSubTopicsByTopicList([topicId]).subscribe((res) =>
        this.subTopics.set(res.data),
      );
    }
  }

  onAddQuestion() {
    if (this.qForm.invalid) {
      this.qForm.markAllAsTouched();
      return;
    }
    const val = this.qForm.value;
    const q: Question = {
      type: 'mcq',
      question: val.question!,
      option1: val.option1!,
      option2: val.option2!,
      option3: val.option3!,
      option4: val.option4!,
      correct_option: val.correct_option as Question['correct_option'],
      explanation: val.explanation || undefined,
      difficulty: val.difficulty || undefined,
      topic_id: val.topic_id || undefined,
      sub_topic_id: val.sub_topic_id || undefined,
      media_url: val.media_url || undefined,
      test_id: this.id,
    };

    if (this.editIndex() !== null) {
      this.stateService.updateQuestion(this.editIndex()!, q);
      this.editIndex.set(null);
      this.toast.success('Question updated');
    } else {
      this.stateService.addQuestion(q);
      this.toast.success('Question added');
    }
    this.qForm.reset();
  }

  startEdit(index: number) {
    // your existing edit logic here...
    this.editIndex.set(index);
    const q = this.stateService.questions()[index];
    this.qForm.patchValue(q);

    // ✅ Scroll to form smoothly
    setTimeout(() => {
      this.questionFormRef.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);  // small delay ensures form has updated before scrolling
  }

  cancelEdit() {
    this.editIndex.set(null);
    this.qForm.reset();
  }

  private toBulkPayload(q: any): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      type: q.type || 'mcq',
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      correct_option: q.correct_option,
      test_id: this.id,
      subject: this.subjectId(), // ✅ required by API despite not being in docs
    };
  
    const optionalString = (value: unknown) =>
      typeof value === 'string' && value.trim() !== '' ? value : undefined;
  
    const explanation = optionalString(q.explanation);
    if (explanation !== undefined) payload['explanation'] = explanation;
  
    const difficulty = optionalString(q.difficulty);
    if (difficulty !== undefined) payload['difficulty'] = difficulty;
  
    return payload;
  }

  saveAndContinue() {
    if (this.stateService.questionCount() === 0) {
      this.errorMsg.set('* Please add at least one question before continuing.');
      return;
    }
  
    if (!this.subjectId()) {
      this.errorMsg.set('Could not determine the subject for this test. Please try again.');
      return;
    }
  
    this.saving.set(true);
    this.errorMsg.set('');
  
    const questionsPayload = this.stateService.questions().map((q) => this.toBulkPayload(q));
  
    this.questionService.bulkCreate({ questions: questionsPayload as unknown as Record<string, unknown>[] }).subscribe({
      next: (res) => {
        const questionIds = res.data.map((q: any) => q.id);
        this.testService.update(this.id, {
          questions: questionIds,
          total_questions: questionIds.length,
        }).subscribe({
          next: () => {
            this.saving.set(false);
            this.toast.success('Questions saved successfully');
            this.router.navigate(['/tests', this.id, 'preview']);
          },
          error: (err) => {
            this.errorMsg.set(err.error?.message || 'Failed to update test');
            this.saving.set(false);
          },
        });
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Failed to save questions');
        this.saving.set(false);
      },
    });
  }

  goBack() {
    const testId = this.testId;
    if (testId) {
      this.router.navigate(['/tests', testId, 'edit']);
    } else {
      this.location.back();
    }
  }
 }