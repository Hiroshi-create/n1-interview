interface Phase {
  template: string;
  text: string;
  isChecked: boolean;
  type: "two_choices" | "free_response" | "one_choice";
}