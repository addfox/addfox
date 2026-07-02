const button = document.querySelector<HTMLButtonElement>("#count");

if (button) {
  button.textContent = "Clicked 0 times";
  let count = 0;
  button.addEventListener("click", () => {
    count += 1;
    button.textContent = `Clicked ${count} ${count === 1 ? "time" : "times"}`;
  });
}
