import { Component, forwardRef, OnDestroy, Input, OnInit } from '@angular/core'; // Added OnInit
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormArray,
  FormBuilder,
  FormControl, // Keep FormControl
  Validators,  // Keep Validators
  AbstractControl
} from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-input-array-field',
  templateUrl: './input-array-field.component.html',
  styleUrls: ['./input-array-field.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputArrayFieldComponent),
      multi: true,
    },
  ],
})
export class InputArrayFieldComponent implements ControlValueAccessor, OnInit, OnDestroy { // Added OnInit
  @Input() placeholderText: string = 'Enter value';
  @Input() initialItemCount: number = 1;
  @Input() itemValidatorFns: Validators[] = [];

  formArray: FormArray;
  private subscriptions: Subscription = new Subscription();

  onChange: (value: string[]) => void = () => {};
  onTouched: () => void = () => {};
  isDisabled: boolean = false;

  constructor(private fb: FormBuilder) {
    this.formArray = this.fb.array([]);
  }

  ngOnInit(): void { // Keep or enhance ngOnInit as per previous logic
    if (this.formArray.length === 0 && this.initialItemCount > 0) {
      for (let i = 0; i < this.initialItemCount; i++) {
        this.addItem(false);
      }
    }
  }

  writeValue(value: string[] | null): void {
    this.formArray.clear({ emitEvent: false });
    if (value && Array.isArray(value)) {
      value.forEach((item) => {
        this.formArray.push(this.fb.control(item, this.itemValidatorFns), { emitEvent: false });
      });
    } else if (this.formArray.length === 0 && this.initialItemCount > 0) {
      for (let i = 0; i < this.initialItemCount; i++) {
        this.addItem(false);
      }
    }
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
    this.subscriptions.add(
      this.formArray.valueChanges.subscribe((values) => {
        this.onChange(values.filter(v => v !== null && v !== undefined));
      })
    );
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    if (isDisabled) {
      this.formArray.disable({ emitEvent: false });
    } else {
      this.formArray.enable({ emitEvent: false });
    }
  }

  get items(): AbstractControl[] {
    return this.formArray.controls;
  }

  addItem(emitChange: boolean = true): void {
    const newControl = this.fb.control(null, this.itemValidatorFns);
    this.formArray.push(newControl, { emitEvent: emitChange });
    if (emitChange) {
      this.onTouched();
    }
  }

  removeItem(index: number): void {
    if (this.formArray.length > 1 || (this.formArray.length === 1 && this.initialItemCount === 0)) {
        this.formArray.removeAt(index);
        this.onTouched();
    } else if (this.formArray.length === 1 && this.initialItemCount > 0) {
        (this.formArray.at(0) as FormControl).setValue(null); // Clear value instead of removing
        this.onTouched();
    }
  }

  handleBlur(): void {
    this.onTouched();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
