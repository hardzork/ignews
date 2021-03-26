import Link, { LinkProps } from "next/link";
import { useRouter } from "next/router";
import { ReactElement, cloneElement } from "react";

interface ActiveLinkProps extends LinkProps {
  children: ReactElement;
  activeClassname: string;
}

export function ActiveLink({
  children,
  activeClassname,
  ...props
}: ActiveLinkProps) {
  const { asPath } = useRouter();
  const className = asPath === props.href ? activeClassname : "";
  return <Link {...props}>{cloneElement(children, { className })}</Link>;
}
