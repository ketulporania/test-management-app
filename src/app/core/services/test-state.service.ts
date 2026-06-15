import { Injectable, signal, computed } from '@angular/core';
import { Test, Question } from '../../models';

@Injectable({ providedIn: 'root' })

export class TestStateService {
  currentTest = signal<Test | null>(null);
  questions = signal<Question[]>([]);

  questionCount = computed(() => this.questions().length);

  setCurrentTest(test: Test) {
    this.currentTest.set(test);
  }

  setQuestions(questions: Question[]) {
    this.questions.set(questions);
  }

  addQuestion(q: Question) {
    this.questions.update((list) => [...list, q]);
  }

  updateQuestion(index: number, q: Question) {
    this.questions.update((list) => {
      const updated = [...list];
      updated[index] = q;
      return updated;
    });
  }

  removeQuestion(index: number) {
    this.questions.update((list) => list.filter((_, i) => i !== index));
  }

  reset() {
    this.currentTest.set(null);
    this.questions.set([]);
  }
}
