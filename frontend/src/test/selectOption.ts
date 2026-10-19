import { fireEvent, screen } from "@testing-library/react";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getSelectButton = (label: string) =>
  screen.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(label)}`),
  });

export const selectOption = async (label: string, option: string) => {
  fireEvent.click(getSelectButton(label));
  fireEvent.click(await screen.findByRole("option", { name: option }));
};
