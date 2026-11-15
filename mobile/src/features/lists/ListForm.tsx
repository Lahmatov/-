import { Field, Section, SwitchRow } from "../../components/ui";
import { L } from "../../i18n";
import type { ListFormValue } from "./listValues";

export { canSaveList, emptyListForm, listFormFrom, listInput, type ListFormValue } from "./listValues";

/** Поля списка: название, описание, видимость. */
export function ListForm({
  value,
  onChange,
  autoFocus,
  onSubmit,
}: {
  value: ListFormValue;
  onChange: (value: ListFormValue) => void;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <Section>
      <Field
        first
        placeholder={L("Название")}
        accessibilityLabel={L("Название")}
        value={value.title}
        onChangeText={(title) => onChange({ ...value, title })}
        autoFocus={autoFocus}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        maxLength={120}
        testID="list-title"
      />
      <Field
        placeholder={L("Описание (необязательно)")}
        accessibilityLabel={L("Описание (необязательно)")}
        value={value.description}
        onChangeText={(description) => onChange({ ...value, description })}
        multiline
        maxLength={1000}
        testID="list-description"
      />
      <SwitchRow title={L("Виден в моём профиле")} value={value.isPublic} onChange={(isPublic) => onChange({ ...value, isPublic })} />
    </Section>
  );
}
