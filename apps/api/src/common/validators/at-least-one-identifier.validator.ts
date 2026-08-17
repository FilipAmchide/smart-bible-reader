import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "AtLeastOneIdentifier", async: false })
class AtLeastOneIdentifierConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    return Boolean(obj.email) || Boolean(obj.phone);
  }

  defaultMessage(): string {
    return "Un email ou un numéro de téléphone est requis.";
  }
}

/**
 * À poser sur le champ `email` (ou `phone`) d'un DTO qui possède les deux
 * champs optionnels : échoue si aucun des deux n'est renseigné.
 */
export function AtLeastOneIdentifier(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: AtLeastOneIdentifierConstraint,
    });
  };
}
