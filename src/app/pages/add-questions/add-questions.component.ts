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
  @ViewChild('questionEditor') questionEditorRef!: ElementRef;
  @ViewChild('csvInput') csvInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInputRef!: ElementRef<HTMLInputElement>;
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
  location = inject(Location);

  editIndex = signal<number | null>(null);
  saving = signal(false);
  errorMsg = signal('');
  topics = signal<Topic[]>([]);
  subTopics = signal<SubTopic[]>([]);
  subjectId = signal<string>('');

  // New signals
  csvUploading = signal(false);
  csvError = signal('');
  imagePreview = signal<string>('');
  uploadingImage = signal(false);

  get testId() { return this.id; }

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
    if (!this.id) { this.loading.set(false); return; }

    this.stateService.setQuestions([]);
    this.stateService.setCurrentTest(null as any);

    const loadFromTest = (test: { subject: string; topics?: string[]; questions?: string[] }) => {
      const rawSubject = typeof test.subject === 'string' ? test.subject : (test.subject as { id: string }).id;

      if (rawSubject) {
        this.subjectService.getSubjects().subscribe((subjectsRes) => {
          const matchById = subjectsRes.data.find((s) => s.id === rawSubject);
          const resolvedSubjectId = matchById?.id ||
            subjectsRes.data.find((s) => s.name.toLowerCase() === rawSubject.toLowerCase())?.id ||
            rawSubject;
          this.subjectId.set(resolvedSubjectId);

          this.subjectService.getTopicsBySubject(resolvedSubjectId).subscribe((res) => {
            this.topics.set(res.data);
            const rawTopicIds = test.topics || [];
            if (rawTopicIds.length > 0) {
              const resolvedTopicIds = rawTopicIds.map((rawTopic) => {
                const matchById = res.data.find((t) => t.id === rawTopic);
                return matchById?.id || res.data.find((t) => t.name.toLowerCase() === rawTopic.toLowerCase())?.id || rawTopic;
              });
              this.subjectService.getSubTopicsByTopicList(resolvedTopicIds).subscribe((subRes) => this.subTopics.set(subRes.data));
            }
          });
        });
      }

      if (test.questions?.length) {
        this.questionService.fetchBulk(test.questions).subscribe((qRes) => {
          this.stateService.setQuestions(qRes.data);
          this.loading.set(false);
        });
      } else {
        this.stateService.setQuestions([]);
        this.loading.set(false);
      }
    };

    this.testService.getById(this.id).subscribe({
      next: (res) => { this.stateService.setCurrentTest(res.data); loadFromTest(res.data); },
      error: () => this.errorMsg.set('Failed to load test'),
    });
  }

  onTopicChange(event: Event) {
    const topicId = (event.target as HTMLSelectElement).value;
    this.qForm.patchValue({ sub_topic_id: '' });
    if (topicId) {
      this.subjectService.getSubTopicsByTopicList([topicId]).subscribe((res) => this.subTopics.set(res.data));
    }
  }

  // ─── Formatting Bar ───────────────────────────────────────────────
  applyFormat(command: string) {
    const textarea = this.questionEditorRef?.nativeElement as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    if (!selected) return;

    let wrapped = '';
    if (command === 'bold') wrapped = `**${selected}**`;
    else if (command === 'italic') wrapped = `_${selected}_`;
    else if (command === 'underline') wrapped = `__${selected}__`;
    else if (command === 'code') wrapped = `\`${selected}\``;

    const newVal = textarea.value.substring(0, start) + wrapped + textarea.value.substring(end);
    this.qForm.patchValue({ question: newVal });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + wrapped.length);
    }, 0);
  }

  // ─── Image Upload ─────────────────────────────────────────────────
  triggerImageUpload() {
    this.imageInputRef?.nativeElement.click();
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Image must be less than 5MB.');
      return;
    }

    this.uploadingImage.set(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.imagePreview.set(base64);
      this.qForm.patchValue({ media_url: base64 });
      this.uploadingImage.set(false);
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.imagePreview.set('');
    this.qForm.patchValue({ media_url: '' });
    if (this.imageInputRef?.nativeElement) {
      this.imageInputRef.nativeElement.value = '';
    }
  }

  // ─── CSV Upload ───────────────────────────────────────────────────
  triggerCsvUpload() {
    this.csvInputRef?.nativeElement.click();
  }

  onCsvSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.csvError.set('');
    this.csvUploading.set(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const questions = this.parseCsv(text);
        if (questions.length === 0) {
          this.csvError.set('No valid questions found in CSV. Check format.');
          this.csvUploading.set(false);
          return;
        }
        questions.forEach(q => this.stateService.addQuestion(q));
        this.toast.success(`${questions.length} question(s) imported from CSV!`);
        this.csvUploading.set(false);
        if (this.csvInputRef?.nativeElement) this.csvInputRef.nativeElement.value = '';
      } catch (err) {
        this.csvError.set('Failed to parse CSV. Please check the format.');
        this.csvUploading.set(false);
      }
    };
    reader.readAsText(file);
  }

  private parseCsv(text: string): Question[] {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const questions: Question[] = [];

    const required = ['question', 'option1', 'option2', 'option3', 'option4', 'correct_option'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      throw new Error(`Missing CSV columns: ${missing.join(', ')}`);
    }

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length < required.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim().replace(/^"|"$/g, ''); });

      if (!row['question'] || !row['option1'] || !row['option2'] || !row['option3'] || !row['option4'] || !row['correct_option']) continue;

      questions.push({
        type: 'mcq',
        question: row['question'],
        option1: row['option1'],
        option2: row['option2'],
        option3: row['option3'],
        option4: row['option4'],
        correct_option: row['correct_option'] as Question['correct_option'],
        explanation: row['explanation'] || undefined,
        difficulty: row['difficulty'] || undefined,
        topic_id: row['topic_id'] || undefined,
        sub_topic_id: row['sub_topic_id'] || undefined,
        media_url: row['media_url'] || undefined,
        test_id: this.id,
      });
    }
    return questions;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += line[i]; }
    }
    result.push(current);
    return result;
  }

  downloadCsvTemplate() {
    const header = 'question,option1,option2,option3,option4,correct_option,explanation,difficulty,media_url';
    const sample = 'What is 2+2?,1,2,3,4,option4,Basic arithmetic,easy,';
    const blob = new Blob([header + '\n' + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Existing methods unchanged ───────────────────────────────────
  onAddQuestion() {
    if (this.qForm.invalid) { this.qForm.markAllAsTouched(); return; }
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
    this.imagePreview.set('');
  }

  startEdit(index: number) {
    this.editIndex.set(index);
    const q = this.stateService.questions()[index];
    this.qForm.patchValue(q);
    if (q.media_url && q.media_url.startsWith('data:image')) {
      this.imagePreview.set(q.media_url);
    } else {
      this.imagePreview.set('');
    }
    setTimeout(() => {
      this.questionFormRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  cancelEdit() {
    this.editIndex.set(null);
    this.qForm.reset();
    this.imagePreview.set('');
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
      subject: this.subjectId(),
    };
    const optionalString = (value: unknown) => typeof value === 'string' && value.trim() !== '' ? value : undefined;
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
        this.testService.update(this.id, { questions: questionIds, total_questions: questionIds.length }).subscribe({
          next: () => {
            this.saving.set(false);
            this.toast.success('Questions saved successfully');
            this.router.navigate(['/tests', this.id, 'preview']);
          },
          error: (err) => { this.errorMsg.set(err.error?.message || 'Failed to update test'); this.saving.set(false); },
        });
      },
      error: (err) => { this.errorMsg.set(err.error?.message || 'Failed to save questions'); this.saving.set(false); },
    });
  }

  goBack() {
    const testId = this.testId;
    if (testId) { this.router.navigate(['/tests', testId, 'edit']); }
    else { this.location.back(); }
  }
}