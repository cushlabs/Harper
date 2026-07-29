package health.harper;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

/**
 * Unit tests for the Greenbaum screen DMN decision (endpoint POST /GreenbaumScreen).
 * Positive when >= 2 of the six items are positive (partner item counts when > 5).
 */
@QuarkusTest
class GreenbaumScreenDecisionTest {

    private static final String CT = "application/json";
    private static final String DECISION = "atRisk";

    @Test
    void twoOrMorePositive_isAtRisk() {
        given().contentType(CT)
            .body("{\"historyOfSignificantTrauma\": true, \"historyOfRunningAway\": false, " +
                  "\"historyOfAlcoholOrDrugAbuse\": true, \"everInvolvedWithLawEnforcement\": false, " +
                  "\"historyOfSTD\": false, \"numberOfSexualPartners\": 2}")
        .when().post("/GreenbaumScreen")
        .then().statusCode(200)
            .body(DECISION, is(true));
    }

    @Test
    void singlePositive_isNotAtRisk() {
        given().contentType(CT)
            .body("{\"historyOfSignificantTrauma\": true, \"historyOfRunningAway\": false, " +
                  "\"historyOfAlcoholOrDrugAbuse\": false, \"everInvolvedWithLawEnforcement\": false, " +
                  "\"historyOfSTD\": false, \"numberOfSexualPartners\": 0}")
        .when().post("/GreenbaumScreen")
        .then().statusCode(200)
            .body(DECISION, is(false));
    }

    @Test
    void moreThanFivePartnersPlusOneItem_isAtRisk() {
        given().contentType(CT)
            .body("{\"historyOfSignificantTrauma\": true, \"historyOfRunningAway\": false, " +
                  "\"historyOfAlcoholOrDrugAbuse\": false, \"everInvolvedWithLawEnforcement\": false, " +
                  "\"historyOfSTD\": false, \"numberOfSexualPartners\": 6}")
        .when().post("/GreenbaumScreen")
        .then().statusCode(200)
            .body(DECISION, is(true));
    }
}
