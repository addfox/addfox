import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "OptionsApp",
  setup() {
    const saved = ref(false);

    return () => (
      <div class="options">
        <h1>Addfox With Vue TSX - Options</h1>
        <p>Options page built with Vue 3 + TypeScript JSX.</p>
        <button
          onClick={() => {
            saved.value = true;
          }}
        >
          {saved.value ? "Saved" : "Save"}
        </button>
      </div>
    );
  },
});
